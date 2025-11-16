import { Controller, Post, Get, UploadedFile, UseInterceptors, Body, Param, InternalServerErrorException, Put } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  AssignmentsService, 
  GroupedByState, 
  GroupedByDistrict, 
  GroupedByMandal, 
  MeritList,
  AssignmentResponse 
} from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAssignment(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { register_id: string; context?: string },
  ): Promise<{ message: string; assignment: AssignmentResponse }> {
    return this.assignmentsService.createAssignment(body, file);
  }

  @Post(':id/analyze')
  async analyzeAssignment(
    @Param('id') id: number,
    @Body('context') context: string,
  ) {
    return this.assignmentsService.analyzeAssignmentWithAI(Number(id), context);
  }

  @Get('merit-list')
  async getMeritList(): Promise<{
    success: boolean;
    data: MeritList;
    error?: string;
  }> {
    console.log('getMeritList endpoint called');
    try {
      console.log('Fetching merit data from service...');
      const meritData = await this.assignmentsService.getMeritList();
      
      console.log('Merit data from service:', {
        hasTopStatePerformers: meritData.topStatePerformers.length > 0,
        hasTopDistrictPerformers: meritData.topDistrictPerformers.length > 0,
        hasTopMandalPerformers: meritData.topMandalPerformers.length > 0,
        hasOverallChampion: !!meritData.overallChampion
      });
      
      const response = {
        success: true,
        data: meritData
      };
      
      console.log('Sending response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Error in getMeritList:', error);
      const errorResponse = {
        success: false,
        error: error.message || 'Failed to fetch merit list',
        data: {
          topStatePerformers: [],
          topDistrictPerformers: [],
          topMandalPerformers: [],
          overallChampion: null
        }
      };
      console.error('Error response:', errorResponse);
      throw new InternalServerErrorException(errorResponse);
    }
  }

  // ⭐ Manual Rating Update via Postman or Admin Panel
  @Put(':id')
  async updateRating(
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    const assignmentId = Number(id);
    const rating = Number(body.rating);

    if (isNaN(assignmentId) || isNaN(rating)) {
      return { message: 'Invalid input — ID and rating must be numbers' };
    }

    if (rating < 0 || rating > 10) {
      return { message: 'Rating must be between 0 and 10' };
    }

    const updated = await this.assignmentsService.updateRating(assignmentId, rating);

    if (!updated) {
      return { message: `Assignment ${assignmentId} not found` };
    }

    return {
      message: `Rating updated successfully for assignment ${assignmentId}`,
      assignment: updated,
    };
  }
}
