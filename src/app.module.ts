// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RegisterModule } from './register/register.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    DatabaseModule,
    AuthModule,
    TypeOrmModule,
    RegisterModule,
    PaymentsModule,
    AssignmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}