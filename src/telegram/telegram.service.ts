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
    
    // Remove all non-digit characters and leading zeros
    return phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
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
    
    if (!this.bot) {
      const errorMsg = '❌ Bot is not initialized. Check if TELEGRAM_BOT_TOKEN is set correctly.';
      logger.error(errorMsg);
      return false;
    }
    
    try {
      // Log all available phone numbers for debugging
      logger.debug('🔍 Querying database for linked phone numbers...');
      const allLinks = await this.telegramLinkRepository.find();
      
      logger.debug(`📋 Found ${allLinks.length} linked phone numbers in database:`);
      allLinks.forEach((link, index) => {
        logger.debug(`${index + 1}. ${link.phoneNumber} (chat ID: ${link.chatId})`);
      });

      // Try to find the Telegram link with the exact phone number match first
      logger.debug(`🔍 Searching for exact match for: ${cleanPhone}`);
      let telegramLink = await this.telegramLinkRepository.findOne({
        where: { phoneNumber: cleanPhone }
      });

      // If no exact match, try with different phone number formats
      if (!telegramLink) {
        logger.debug('🔍 No exact match found, trying alternative formats...');
        
        // Try with 91 prefix if it's not there
        let alternativeNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
        logger.debug(`🔄 Trying with 91 prefix: ${alternativeNumber}`);
        telegramLink = await this.telegramLinkRepository.findOne({
          where: { phoneNumber: alternativeNumber }
        });

        // Try without 91 prefix if it's there
        if (!telegramLink && cleanPhone.startsWith('91')) {
          alternativeNumber = cleanPhone.substring(2);
          logger.debug(`🔄 Trying without 91 prefix: ${alternativeNumber}`);
          telegramLink = await this.telegramLinkRepository.findOne({
            where: { phoneNumber: alternativeNumber }
          });
        }
      }

      if (!telegramLink) {
        const errorMsg = `❌ No Telegram link found for phone number: ${cleanPhone}`;
        logger.error(errorMsg);
        logger.error('📋 Available numbers in database: ' + allLinks.map(l => l.phoneNumber).join(', '));
        return false;
      }

      // Send the message
      logger.debug(`📤 Sending message to chat ID: ${telegramLink.chatId}`);
      logger.verbose(`💬 Message preview: ${message.substring(0, 50)}...`);
      
      try {
        await this.bot.sendMessage(telegramLink.chatId.toString(), message, { 
          parse_mode: 'Markdown' 
        });
        
        logger.log(`✅ Successfully sent notification to ${telegramLink.phoneNumber} (Chat ID: ${telegramLink.chatId})`);
        return true;
      } catch (sendError) {
        logger.error(`❌ Failed to send message to chat ID ${telegramLink.chatId}:`, {
          error: sendError.message,
          stack: sendError.stack,
          chatId: telegramLink.chatId,
          phoneNumber: telegramLink.phoneNumber
        });
        return false;
      }
    } catch (error) {
      const errorDetails = {
        error: error.message,
        stack: error.stack,
        phoneNumber: cleanPhone,
        timestamp: new Date().toISOString()
      };
      logger.error('❌ Error sending Telegram notification', errorDetails);
      
      // Log more details for common errors
      if (error.response) {
        logger.error('📡 Telegram API Error:', {
          statusCode: error.response.statusCode,
          description: error.response.description,
          errorCode: error.response.error_code,
          parameters: error.response.parameters
        });
      }
      
      return false;
    } finally {
      logger.debug('🏁 ===== END: sendEventNotification =====');
    }
  }
}
