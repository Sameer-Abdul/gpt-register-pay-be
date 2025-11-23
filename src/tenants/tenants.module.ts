import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Tenant } from './tenant.entity';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    MulterModule.register({
      dest: './uploads/tenants',
    }),
  ],
  controllers: [TenantsController],
  exports: [TypeOrmModule],
})
export class TenantsModule {}
