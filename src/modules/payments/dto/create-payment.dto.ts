// src/modules/payments/dto/create-payment.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt } from 'class-validator';

export class FileMetadata {
  originalname: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  utrNumber: string;

  @IsNotEmpty()
  registerId: number | string;  // Allow both number and string

  @IsOptional()
  paymentScreenshot?: FileMetadata;

  // This will be called by class-transformer
  static fromRequest(data: any): CreatePaymentDto {
    const dto = new CreatePaymentDto();
    dto.utrNumber = data.utrNumber;
    dto.registerId = typeof data.registerId === 'string' 
      ? parseInt(data.registerId, 10) 
      : data.registerId;
    dto.paymentScreenshot = data.paymentScreenshot;
    return dto;
  }
}