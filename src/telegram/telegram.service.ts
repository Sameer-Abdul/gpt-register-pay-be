import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBot } from './telegram.bot';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramLink } from './entities/telegram-link.entity';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;

  constructor(
    private configService: ConfigService,
    @InjectRepository(TelegramLink)
    private telegramLinkRepository: Repository<TelegramLink>,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      console.warn('⚠ TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.');
      return;
    }
    this.bot = new TelegramBot(token, this);
  }

  async onModuleInit() {
    if (!this.bot) {
      console.error('❌ Telegram bot not initialized. Check if TELEGRAM_BOT_TOKEN is set correctly.');
      return;
    }

    try {
      // Launch the bot
      await this.bot.launch();
      console.log('🤖 Telegram bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error.message);
    }
  }

  async handleStart(chatId: number) {
    return `👋 Welcome to Event Scheduler Bot!\n\n` +
           `Available commands:\n` +
           `/start - Show this message\n` +
           `/link <phone> - Link your phone number to receive notifications`;
  }

  async handleLinkCommand(chatId: number, phone: string) {
    try {
      // Clean and validate phone number
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (!cleanPhone) {
        return '❌ Please provide a valid phone number. Example: /link9876543210';
      }

      console.log(`Linking chat ID ${chatId} with phone: ${cleanPhone}`);

      // Check for existing link with this chat ID
      const existingLink = await this.telegramLinkRepository.findOne({
        where: { chatId }
      });

      if (existingLink) {
        if (existingLink.phoneNumber === cleanPhone) {
          return '✅ This phone number is already linked to your Telegram account.';
        }
        return '❌ This Telegram account is already linked to another phone number.';
      }

      // Create new link
      const newLink = this.telegramLinkRepository.create({
        chatId,
        phoneNumber: cleanPhone
      });
      
      await this.telegramLinkRepository.save(newLink);
      
      return '✅ Your phone number has been linked successfully!';
    } catch (error) {
      console.error('Error in handleLinkCommand:', error);
      return '❌ An error occurred while processing your request. Please try again later.';
    }
  }

  async sendNotification(chatId: string, message: string, options?: any): Promise<boolean> {
    console.log(`📤 [TelegramService] Sending message to chat ID: ${chatId}`);
    console.log(`   Message length: ${message.length} characters`);
    
    if (!this.bot) {
      console.error('❌ [TelegramService] Bot is not initialized');
      return false;
    }
    
    try {
      const startTime = Date.now();
      console.log(`   Sending message at: ${new Date().toISOString()}`);
      
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        ...options 
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ [TelegramService] Message sent successfully in ${duration}ms`);
      return true;
      
    } catch (error) {
      console.error('❌ [TelegramService] Error sending message:', {
        chatId,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Special handling for common Telegram API errors
      if (error.response) {
        const { statusCode, body } = error.response;
        console.error(`   Telegram API Error (${statusCode}):`, {
          description: body?.description,
          error_code: body?.error_code,
          parameters: body?.parameters
        });
        
        // Common error: Bot was blocked by the user
        if (statusCode === 403 && body?.description?.includes('bot was blocked')) {
          console.error('   ℹ️ The user has blocked the bot or the bot was stopped');
        }
        
        // Common error: Chat not found
        if (statusCode === 400 && body?.description?.includes('chat not found')) {
          console.error('   ℹ️ The chat was not found. The user may have deleted their account.');
        }
      }
      
      return false;
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Remove leading zeros
  cleanNumber = cleanNumber.replace(/^0+/, '');
  
  // Ensure the number is exactly 10 digits (Indian mobile numbers)
  if (cleanNumber.length === 10) {
    return cleanNumber;
  }
  
  // If number is longer than 10 digits, take last 10 digits
  if (cleanNumber.length > 10) {
    return cleanNumber.slice(-10);
  }
  
  // If number is less than 10 digits, it's invalid
  return '';
}

  async sendEventNotification(phoneNumber: string, message: string): Promise<boolean> {
    const logger = new Logger('TelegramService');
    logger.debug('🚀 ===== START: sendEventNotification =====');
    logger.debug(`📱 Input phone number: '${phoneNumber}'`);
    
    if (!phoneNumber) {
        logger.error('❌ No phone number provided for notification');
        return false;
    }

    // Normalize the phone number
    const cleanPhone = this.normalizePhoneNumber(phoneNumber);
    logger.debug(`🔄 Normalized phone number: '${cleanPhone}'`);
    
    if (!cleanPhone) {
        logger.error(`❌ Invalid phone number format: ${phoneNumber}`);
        return false;
    }

    if (!this.bot) {
        const errorMsg = '❌ Bot is not initialized. Check if TELEGRAM_BOT_TOKEN is set correctly.';
        logger.error(errorMsg);
        return false;
    }
    
    try {
        // Get all links for debugging
        const allLinks = await this.telegramLinkRepository.find();
        logger.debug(`📋 Found ${allLinks.length} linked phone numbers in database`);
        
        // Try to find the Telegram link with normalized phone number
        logger.debug(`🔍 Searching for: ${cleanPhone}`);
        let telegramLink = await this.telegramLinkRepository.findOne({
            where: { phoneNumber: cleanPhone }
        });

        // If not found, try to find by last 10 digits
        if (!telegramLink) {
            logger.debug('🔍 No exact match, trying to find by last 10 digits...');
            const lastTenDigits = cleanPhone.slice(-10);
            telegramLink = await this.telegramLinkRepository
                .createQueryBuilder('link')
                .where('RIGHT(link.phoneNumber, 10) = :lastTen', { lastTen: lastTenDigits })
                .getOne();
        }

        if (!telegramLink) {
            logger.error(`❌ No Telegram link found for phone number: ${cleanPhone}`);
            logger.debug('Available numbers: ' + allLinks.map(l => l.phoneNumber).join(', '));
            return false;
        }

        // Send the message
        logger.debug(`📤 Sending to chat ID: ${telegramLink.chatId}`);
        await this.bot.sendMessage(telegramLink.chatId.toString(), message, { 
            parse_mode: 'Markdown' 
        });
        
        logger.log(`✅ Sent to ${telegramLink.phoneNumber} (Chat ID: ${telegramLink.chatId})`);
        return true;

    } catch (error) {
        logger.error(`❌ Error in sendEventNotification: ${error.message}`, error.stack);
        return false;
    } finally {
        logger.debug('🏁 ===== END: sendEventNotification =====');
    }
}
}
