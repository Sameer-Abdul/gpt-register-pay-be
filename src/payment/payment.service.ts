import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Register } from '../register/entities/register.entity';

export interface CreatePaymentDto {
  registrationId: number;
  utrNumber: string;
  file: Express.Multer.File;
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Register)
    private registerRepository: Repository<Register>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { registrationId, utrNumber, file } = createPaymentDto;
    
    if (!file || !file.buffer) {
      throw new Error('Screenshot file is required');
    }

    console.log('Processing payment with data:', {
      registrationId,
      utrNumber: utrNumber ? `${utrNumber.substring(0, 4)}...` : 'missing',
      fileInfo: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer?.length || 0
      }
    });
    
    try {
      // Find the registration
      const register = await this.registerRepository.findOne({
        where: { id: registrationId },
      });
      
      if (!register) {
        throw new NotFoundException(`Registration with ID ${registrationId} not found`);
      }

      // Check if payment already exists for this registration
      let payment = await this.paymentRepository.findOne({
        where: { registrationId },
      });

      // Create or update payment record
      if (!payment) {
        payment = new Payment();
        payment.registrationId = registrationId;
      }

      // Update payment details
      payment.utrNumber = utrNumber;
      payment.screenshot = file.buffer;
      payment.screenshotMimeType = file.mimetype;

      // Save payment
      const savedPayment = await this.paymentRepository.save(payment);
      
      console.log('Payment processed successfully:', { 
        paymentId: savedPayment.id,
        registrationId: savedPayment.registrationId,
        utrNumber: savedPayment.utrNumber ? `${savedPayment.utrNumber.substring(0, 4)}...` : 'missing',
        hasScreenshot: !!savedPayment.screenshot,
        screenshotSize: savedPayment.screenshot?.length || 0
      });
      
      return savedPayment;
    } catch (error) {
      console.error('Error processing payment:', {
        error: error.message,
        stack: error.stack,
        registrationId,
        utrNumber: utrNumber ? `${utrNumber.substring(0, 4)}...` : 'missing'
      });
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to process payment');
    }
  }
}
