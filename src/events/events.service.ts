import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { TelegramService } from '../telegram/telegram.service';
import { Register } from '../register/entities/register.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create(createEventDto);
    const savedEvent = await this.eventRepository.save(event);
    
    // Notify users about the new event
    await this.notifyUsersAboutEvent(savedEvent);
    
    return savedEvent;
  }

  private async notifyUsersAboutEvent(event: Event) {
    const logger = new Logger('EventsService');
    console.log('\n' + '='.repeat(80));
    console.log('📢 TELEGRAM NOTIFICATION DEBUGGER');
    console.log('='.repeat(80));
    console.log(`📅 EVENT: ${event.name} (ID: ${event.id})`);
    console.log(`📞 POC PHONE: ${event.organizationContact || 'Not provided'}`);
    console.log('-' .repeat(80));
    
    try {
      // 1. Notify POC if contact exists
      if (event.organizationContact) {
        console.log('\n🔔 STEP 1: SENDING TO POC');
        console.log('-' .repeat(40));
        console.log(`📱 Phone: ${event.organizationContact}`);
        
        const pocMessage = `📢 *New Event Created: ${event.name}*\n\n` +
          `📅 *When:* ${this.formatDate(event.date)} ${event.startTime} - ${event.endTime}\n` +
          `📍 *Where:* ${event.venue}\n` +
          `👤 *You are listed as the Point of Contact*`;
        
        console.log('💬 Message:', pocMessage.split('\n')[0] + '...');
        
        try {
          const pocResult = await this.telegramService.sendEventNotification(
            event.organizationContact, 
            pocMessage
          );
          
          if (pocResult) {
            console.log('✅ STATUS: POC notification sent successfully!');
          } else {
            console.log('❌ STATUS: Failed to send to POC (no error thrown)');
          }
        } catch (pocError) {
          console.error('❌ POC NOTIFICATION ERROR:', pocError.message);
        }
      } else {
        console.log('\n⚠️  No POC phone number provided, skipping POC notification');
      }

      // 2. Notify Participants
      console.log('\n👥 STEP 2: NOTIFYING REGISTERED USERS');
      console.log('-' .repeat(40));
      
      const users = await this.registerRepository.find();
      
      console.log(`🔍 Found ${users.length} active users to notify`);
      
      let successCount = 0;
      let failCount = 0;
      const failedUsers: {id: number, phone: string, reason: string}[] = [];

      for (const [index, user] of users.entries()) {
        const userNum = index + 1;
        console.log(`\n👤 USER ${userNum}/${users.length} (ID: ${user.id})`);
        
        try {
          if (!user.mobileNo) {
            const msg = '❌ SKIPPED: No mobile number';
            console.log(msg);
            failedUsers.push({ id: user.id, phone: 'N/A', reason: 'No mobile number' });
            failCount++;
            continue;
          }

          const cleanPhone = String(user.mobileNo).replace(/\D/g, '');
          if (!cleanPhone) {
            const msg = `❌ SKIPPED: Invalid mobile number: ${user.mobileNo}`;
            console.log(msg);
            failedUsers.push({ id: user.id, phone: String(user.mobileNo), reason: 'Invalid mobile number format' });
            failCount++;
            continue;
          }
          
          console.log(`📱 Phone: ${cleanPhone}`);
          
          const message = `📢 *New Event: ${event.name}*\n\n` +
            `📅 *When:* ${this.formatDate(event.date)} ${event.startTime} - ${event.endTime}\n` +
            `📍 *Where:* ${event.venue}\n\n` +
            `We look forward to seeing you there!`;
          
          console.log('💬 Message:', message.split('\n')[0] + '...');
          
          const result = await this.telegramService.sendEventNotification(cleanPhone, message);
          
          if (result) {
            console.log('✅ STATUS: Sent successfully!');
            successCount++;
          } else {
            console.log('❌ STATUS: Failed to send (no error thrown)');
            failedUsers.push({ id: user.id, phone: cleanPhone, reason: 'Failed to send notification' });
            failCount++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('❌ ERROR:', errorMsg);
          failedUsers.push({ 
            id: user.id, 
            phone: user.mobileNo ? String(user.mobileNo).replace(/\D/g, '') : 'N/A', 
            reason: `Error: ${errorMsg.substring(0, 100)}...` 
          });
          failCount++;
        }
      }
      
      // Print summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 NOTIFICATION SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Successfully sent: ${successCount} users`);
      console.log(`❌ Failed to send: ${failCount} users`);
      console.log(`📋 Total processed: ${users.length} users`);
      
      if (failedUsers.length > 0) {
        console.log('\n🔍 FAILED NOTIFICATIONS:');
        console.log('-' .repeat(40));
        failedUsers.forEach((user, index) => {
          console.log(`${index + 1}. User ID: ${user.id} | Phone: ${user.phone} | Reason: ${user.reason}`);
        });
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('🔚 TELEGRAM NOTIFICATION DEBUGGER COMPLETE');
      console.log('='.repeat(80) + '\n');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('\n❌ CRITICAL ERROR IN NOTIFICATION PROCESS:');
      console.error('-' .repeat(40));
      console.error(errorMsg);
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
  }

  private formatEventNotification(event: Event): string {
    return `📢 *New Event: ${event.name}*\n\n` +
           `📅 *When:* ${this.formatDate(event.date)} ${event.startTime} - ${event.endTime}\n` +
           `📍 *Where:* ${event.venue}\n` +
           (event.organizationName ? `🏢 *Organization:* ${event.organizationName}\n` : '') +
           (event.organizationPoc ? `👤 *Contact Person:* ${event.organizationPoc}\n` : '') +
           (event.additionalComments ? `\n📝 *Additional Info:* ${event.additionalComments}\n` : '\n') +
           `\n_This is an automated notification. Please do not reply to this message._`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  }


  async findAll(): Promise<Event[]> {
    return this.eventRepository.find({
      order: { date: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new Error(`Event with ID ${id} not found`);
    }
    return event;
  }
}
