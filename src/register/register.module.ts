// src/register/register.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Register } from './entities/register.entity';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Register])],
  controllers: [RegisterController],
  providers: [RegisterService],
  exports: [RegisterService], // Make sure to export the service
})
export class RegisterModule {}