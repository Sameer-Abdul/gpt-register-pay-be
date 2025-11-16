import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Body, 
  HttpStatus, 
  HttpException,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentService } from './payment.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('api/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('screenshot', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { utrNumber: string; registrationId: string },
  ) {
    // Log incoming request for debugging
    console.log('=== Payment Request Received ===');
    console.log('File info:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      bufferLength: file?.buffer?.length,
    });
    console.log('Request body:', body);

    // Validate required fields
    if (!file) {
      throw new BadRequestException('Payment screenshot is required');
    }

    if (!body?.utrNumber?.trim()) {
      throw new BadRequestException('UTR number is required');
    }

    if (!body?.registrationId) {
      throw new BadRequestException('Registration ID is required');
    }

    try {
      const payment = await this.paymentService.create({
        utrNumber: body.utrNumber,
        registrationId: parseInt(body.registrationId, 10),
        file,
      });

      return {
        success: true,
        message: 'Payment processed successfully',
        paymentId: payment.id,
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      
      // Handle specific error cases
      if (error instanceof NotFoundException) {
        throw new BadRequestException(error.message);
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error processing payment',
          message: error.message || 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
