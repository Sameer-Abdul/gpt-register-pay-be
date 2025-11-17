import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { Register } from '../entities';
import { TelegramLink } from './entities/telegram-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Register, TelegramLink]),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
