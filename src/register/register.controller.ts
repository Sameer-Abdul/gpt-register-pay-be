import { Controller, Get, Post, Body, Param, HttpStatus, HttpException } from '@nestjs/common';
import { RegisterService } from './register.service';
import { CreateRegisterDto } from './dto/create-register.dto';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  async create(@Body() createRegisterDto: CreateRegisterDto) {
    try {
      const register = await this.registerService.create(createRegisterDto);
      return { success: true, id: register.id };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error creating registration',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('states')
  async getStates() {
    try {
      const states = await this.registerService.getStates();
      return { success: true, data: states };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error fetching states',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('districts/:state')
  async getDistricts(@Param('state') state: string) {
    try {
      const districts = await this.registerService.getDistricts(state);
      return { success: true, data: districts };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error fetching districts',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('mandals/:district')
  async getMandals(@Param('district') district: string) {
    try {
      const mandals = await this.registerService.getMandals(district);
      return { success: true, data: mandals };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error fetching mandals',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
