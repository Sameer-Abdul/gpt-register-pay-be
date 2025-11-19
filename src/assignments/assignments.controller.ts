import { Controller, Post, Get, UploadedFile, UseInterceptors, Body, Param, InternalServerErrorException, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as multer from 'multer';
import type { MulterFile } from '../common/types';
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
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAssignment(
    @UploadedFile() file: MulterFile,
    @Body() body: { register_id: string; context?: string },
  ): Promise<{ message: string; assignment: AssignmentResponse }> {
    return this.assignmentsService.createAssignment(body, file);
  }

  // New: Upload file to configurable storage path with hierarchical folders
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadAssignmentFile(
    @Param('id') id: string,
    @UploadedFile() file: MulterFile
  ) {
    const assignmentId = Number(id);
    if (!assignmentId || Number.isNaN(assignmentId)) {
      throw new InternalServerErrorException('Invalid assignment id');
    }
    const result = await this.assignmentsService.uploadAssignmentFile(assignmentId, file);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/analyze')
  async analyzeAssignment(
    @Param('id') id: number,
    @Body('context') context: string,
  ) {
    return this.assignmentsService.analyzeAssignmentWithAI(Number(id), context);
  }

  // List the assignment storage folder tree for verification on Render
  @Get('tree')
  async getAssignmentTree() {
    const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';
    const fullPath = path.join(process.cwd(), basePath);

    const buildTree = async (dir: string): Promise<any[]> => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      const result: any[] = [];
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          result.push({ folder: item.name, children: await buildTree(full) });
        } else {
          result.push({ file: item.name });
        }
      }
      return result;
    };

    try {
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        return { basePath, fullPath, exists: false, tree: [] };
      }
      const tree = await buildTree(fullPath);
      return { basePath, fullPath, exists: true, tree };
    } catch (e: any) {
      return { basePath, fullPath, exists: false, tree: [], error: e?.message || String(e) };
    }
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
