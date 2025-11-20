import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Controller('tenants')
export class TenantsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get(':id/header')
  async getTenantHeader(@Param('id') id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { tenant_id: id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      success: true,
      data: {
        tenantId: tenant.tenant_id,
        name: tenant.name,
        imageLeft: tenant.image_left,
        imageRight: tenant.image_right,
        header_format: tenant.header_format,
        header_custom_lines: tenant.header_format === 'CUSTOM' 
          ? tenant.header_custom_lines 
          : this.autoFormatHeader(tenant.name),
      },
    };
  }

  private autoFormatHeader(name: string): string {
    if (!name) return '';
    
    const words = name.split(' ');
    const result: string[] = [];
    let currentLine: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      currentLine.push(words[i]);
      
      // Split into lines of 3-4 words
      if (currentLine.length >= 3 && (currentLine.length >= 4 || i === words.length - 1)) {
        result.push(currentLine.join(' '));
        currentLine = [];
      }
    }
    
    // Add any remaining words
    if (currentLine.length > 0) {
      result.push(currentLine.join(' '));
    }
    
    return result.join('\n');
  }
}
