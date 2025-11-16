import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('locations')
@Controller('api/locations')
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all unique states' })
  @ApiResponse({ status: 200, description: 'Returns all unique states' })
  async getStates(): Promise<{ success: boolean; data: string[] }> {
    const states = await this.locationsService.getStates();
    return {
      success: true,
      data: states
    };
  }

  @Get('districts/:state')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get districts by state' })
  @ApiResponse({ status: 200, description: 'Returns districts for the specified state' })
  @ApiResponse({ status: 400, description: 'State parameter is required' })
  async getDistricts(
    @Param('state') state: string
  ): Promise<{ success: boolean; data: string[]; message?: string }> {
    if (!state) {
      return {
        success: false,
        message: 'State parameter is required',
        data: []
      };
    }
    const districts = await this.locationsService.getDistricts(state);
    return {
      success: true,
      data: districts
    };
  }

  @Get('mandals/:district')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get mandals by district' })
  @ApiResponse({ status: 200, description: 'Returns mandals for the specified district' })
  @ApiResponse({ status: 400, description: 'District parameter is required' })
  async getMandals(
    @Param('district') district: string
  ): Promise<{ success: boolean; data: string[]; message?: string }> {
    if (!district) {
      return {
        success: false,
        message: 'District parameter is required',
        data: []
      };
    }
    const mandals = await this.locationsService.getMandals(district);
    return {
      success: true,
      data: mandals
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, description: 'Returns all locations' })
  async getAllLocations(): Promise<{ success: boolean; data: any[] }> {
    const locations = await this.locationsService.getAllLocations();
    return {
      success: true,
      data: locations
    };
  }
}
