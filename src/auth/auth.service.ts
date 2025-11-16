import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Register } from '../register/entities/register.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.registerRepository.findOne({ 
      where: { email },
      relations: ['tenant']
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has a valid license
    const isLicenseValid = await this.validateTenantLicense(user.tenantId);
    if (!isLicenseValid) {
      throw new UnauthorizedException('Your license has expired. Please contact the administrator.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        tenantId: user.tenantId
      }
    };
  }

  private async validateTenantLicense(tenantId: string): Promise<boolean> {
    // Get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query the license table to check for a valid license
    const license = await this.registerRepository.manager.query(`
      SELECT * FROM license 
      WHERE tenant_id = $1 
      AND valid_from <= $2 
      AND valid_to >= $2
      AND eligible_for_license = 'Yes'
      LIMIT 1
    `, [tenantId, today]);

    return license.length > 0;
  }
}
