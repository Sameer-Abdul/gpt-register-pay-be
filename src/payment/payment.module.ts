import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Register } from '../register/entities/register.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Register])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
