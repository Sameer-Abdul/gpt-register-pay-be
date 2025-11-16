// src/modules/payments/payments.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Register } from '../../register/entities/register.entity';
import * as fs from 'fs';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
  ) {}

  // ... rest of your service methods ...


  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { utrNumber, paymentScreenshot, registerId } = createPaymentDto;
    
    // Convert registerId to number if it's a string
    const registerIdNum = typeof registerId === 'string' 
      ? parseInt(registerId, 10) 
      : registerId;
    
    if (isNaN(registerIdNum)) {
      throw new BadRequestException('Invalid registerId. Must be a valid number.');
    }
    
    // Start a transaction
    const queryRunner = this.paymentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('Looking for register with ID:', registerIdNum);
      
      // Find the register record - simplified query without relations first
      const register = await queryRunner.manager.findOne(Register, {
        where: { id: registerIdNum }
      });
      
      if (!register) {
        console.error(`Register with ID ${registerIdNum} not found in database`);
        throw new NotFoundException('Register record not found');
      }
      
      // Now load the payment relation if it exists
      if (register.paymentId) {
        register.payment = await queryRunner.manager.findOne(Payment, {
          where: { id: register.paymentId }
        });
      }
      
      console.log('Found register:', register);

      let payment: Payment;

      // Check if payment already exists for this register
      if (register.payment) {
        // Update existing payment
        payment = register.payment;
        if (paymentScreenshot) {
          payment.screenshotPath = paymentScreenshot.path;
          payment.screenshotMimeType = paymentScreenshot.mimetype;
          payment.originalFilename = paymentScreenshot.originalname;
          payment.fileSize = paymentScreenshot.size;
        }
        payment.utrNumber = utrNumber;
      } else {
        // Create new payment
        payment = new Payment();
        payment.utrNumber = utrNumber;
        payment.registerId = registerIdNum;
        
        if (paymentScreenshot) {
          payment.screenshotPath = paymentScreenshot.path;
          payment.screenshotMimeType = paymentScreenshot.mimetype;
          payment.originalFilename = paymentScreenshot.originalname;
          payment.fileSize = paymentScreenshot.size;
        }
      }
      
      // Save the payment
      const savedPayment = await queryRunner.manager.save(Payment, payment);
        
      // Read the file content if it exists
      let fileContent: Buffer | null = null;
      if (paymentScreenshot?.path) {
        fileContent = await fs.promises.readFile(paymentScreenshot.path);
      }
      
      // Update the register with payment reference and UTR
      register.paymentId = savedPayment.id;
      register.utrNumber = savedPayment.utrNumber;
      
      // Only update screenshot if we have content
      if (fileContent) {
        register.paymentScreenshot = fileContent;
        register.screenshotMimeType = savedPayment.screenshotMimeType;
      }
      
      // Save the updated register
      await queryRunner.manager.save(Register, register);
        
      // Ensure the payment has the registerId set
      if (!savedPayment.registerId) {
        savedPayment.registerId = register.id;
        await queryRunner.manager.save(Payment, savedPayment);
      }
      
      await queryRunner.commitTransaction();
      return savedPayment;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in payment creation:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ... rest of your service methods ...

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['register']
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ 
      where: { id },
      relations: ['register']
    });
    
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    
    return payment;
  }
}
