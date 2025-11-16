import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, FileMetadata } from './dto/create-payment.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          console.log('Destination called with file:', file);
          const uploadDir = './uploads';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          console.log('Generating filename for file:', file);
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          const filename = `${randomName}${extname(file.originalname)}`;
          console.log('Generated filename:', filename);
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        console.log('File filter processing file:', file);
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
          console.log('Invalid file type:', file.originalname);
          return cb(new Error('Only image files (jpg, jpeg, png, gif) and PDFs are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1,
      },
    })
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Log the raw request body and headers for debugging
    console.log('=== REQUEST DEBUGGING ===');
    console.log('Raw request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Request content-type:', req.headers['content-type']);
    
    // Parse the form data
    const body = req.body;
    console.log('Parsed form data:', body);
    
    // Log all form fields for debugging
    console.log('All form fields:');
    for (const [key, value] of Object.entries(body)) {
      console.log(`- ${key}:`, value, `(type: ${typeof value})`);
    }
    
    // Manually parse the form data
    const registerId = body.registerId ? parseInt(body.registerId, 10) : null;
    const utrNumber = body.utrNumber || '';
    
    // Log the parsed values
    console.log('Parsed registerId:', registerId, '(type:', typeof registerId, ')');
    console.log('Parsed utrNumber:', utrNumber);
    
    // Validate the registerId
    if (!registerId || isNaN(registerId)) {
      console.error('=== INVALID REGISTER ID ===');
      console.error('Original registerId value:', body.registerId);
      console.error('Type of registerId:', typeof body.registerId);
      console.error('Request body keys:', Object.keys(body));
      if (req.rawBody) {
        console.error('Raw request body (first 500 chars):', String(req.rawBody).substring(0, 500));
      }
      throw new BadRequestException('Invalid registerId. Please provide a valid numeric register ID.');
    }
    try {
      console.log('=== NEW FILE UPLOAD REQUEST ===');
      
      // Check if file exists
      if (!file) {
        console.log('No file received in the request');
        throw new BadRequestException('No file uploaded. Please ensure you are sending the file with the field name "file"');
      }

      console.log('File info:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        filename: (file as any).filename
      });

      // Create file metadata for the database
      const fileMetadata: FileMetadata = {
        originalname: file.originalname,
        filename: (file as any).filename || file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      };

      console.log('Creating payment with data:', {
        registerId,
        utrNumber,
        fileMetadata
      });

      // Create the payment with the file metadata and registerId
      const payment = await this.paymentsService.create({
        registerId,
        utrNumber,
        paymentScreenshot: fileMetadata,
      });

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    console.error('Error in payment creation:', error);
    // Clean up the file if it was partially written
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new BadRequestException(error.message || 'Failed to process payment');
  }
}

  @Get()
  async findAll() {
    const payments = await this.paymentsService.findAll();
    return {
      success: true,
      data: payments,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    if (!payment) {
      throw new BadRequestException('Payment not found');
    }
    return {
      success: true,
      data: payment,
    };
  }
}