// src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Register } from '../../register/entities/register.entity';
import { RegisterModule } from '../../register/register.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Register]), // Add Register here
    RegisterModule, // Import RegisterModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}