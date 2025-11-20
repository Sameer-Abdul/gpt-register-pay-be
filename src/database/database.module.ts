// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Register } from '../register/entities/register.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Location } from '../locations/entities/location.entity';
import { TelegramLink } from '../telegram/entities/telegram-link.entity';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Tenant } from '../tenants/tenant.entity';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbPort = configService.get<number>('DB_PORT');
        if (!dbPort) {
          throw new Error('DB_PORT is not defined in the configuration');
        }
        
        return {
          type: 'postgres',
          host: configService.get('DB_HOST') || 'localhost',
          port: +dbPort,
          username: configService.get('DB_USERNAME') || 'postgres',
          password: configService.get('DB_PASSWORD') || '7799179121',
          database: configService.get('DB_NAME') || 'register_payment',
          entities: [Register, Payment, Assignment, Location, TelegramLink, Tenant],
          migrations: [path.join(__dirname, '../../migrations/*.ts')],
          migrationsRun: true, // Run migrations on startup
          synchronize: false, // Keep this as false when using migrations
          logging: ['error', 'warn', 'schema'], // More detailed logging
          namingStrategy: new SnakeNamingStrategy(), // Use snake_case for database columns
          ssl: configService.get('NODE_ENV') === 'production' || configService.get('DB_SSL') === 'true' ? {
            rejectUnauthorized: false, // This is needed for self-signed certificates
            sslmode: 'require'
          } : false,
          extra: {
            ssl: configService.get('NODE_ENV') === 'production' || configService.get('DB_SSL') === 'true' ? {
              rejectUnauthorized: false
            } : null
          }
        };
      },
    }),
  ],
})
export class DatabaseModule {}