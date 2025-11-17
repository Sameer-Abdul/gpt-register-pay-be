import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Register } from './register/entities/register.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { TelegramLink } from './telegram/entities/telegram-link.entity';
import { Assignment } from './assignments/entities/assignment.entity';
import { Location } from './locations/entities/location.entity';

config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres', 
  host: configService.get('DB_HOST') || 'localhost',
  port: configService.get<number>('DB_PORT') || 5432,
  username: configService.get('DB_USERNAME') || 'postgres',
  password: configService.get('DB_PASSWORD') || '7799179121',
  database: configService.get('DB_NAME') || 'register_payment',
  entities: [
    Register,
    Payment,
    TelegramLink,
    Assignment,
    Location
  ],
  synchronize: false,
  logging: true,
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});
