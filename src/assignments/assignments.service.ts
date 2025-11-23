import * as multer from 'multer';
import { Injectable, Logger, NotFoundException, Inject, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, Not, IsNull, getConnection } from 'typeorm';
import Groq from 'groq-sdk';

// FIX: pdf-parse must be imported as default for Node 22 / ESM
import pdfParse from "pdf-parse";

import { MulterFile } from '../common/types';
import { Assignment } from './entities/assignment.entity';
import { Register } from '../register/entities/register.entity';
import * as fs from 'fs';
import * as os from 'os';
import type { AssignmentStorage } from './storage/assignment-storage.interface';

// Define response interfaces
export interface AssignmentResponse {
  id: number;
  register_id: number;
  state: string | null;
  district: string | null;
  mandal: string | null;
  context: string | null;
  ai_rating: number | null;
  manual_rating: number | null;
  final_rating: number | null;
}

export interface MeritListItem {
  id: number;
  register_id: number;
  file_name: string;
  ai_rating: number | null;
  manual_rating: number | null;
  final_rating: number;
  state?: string | null;
  district?: string | null;
  mandal?: string | null;
  context?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_email?: string | null;
}

export interface GroupedByState {
  state: string;
  records: MeritListItem[];
}

export interface GroupedByDistrict {
  district: string;
  records: MeritListItem[];
}
export interface GroupedByMandal {
  mandal: string;
  records: MeritListItem[];
}

export interface MeritList {
  topStatePerformers: Array<{ state: string; records: MeritListItem[] }>
  topDistrictPerformers: Array<{ district: string; records: MeritListItem[] }>
  topMandalPerformers: Array<{ mandal: string; records: MeritListItem[] }>
  overallChampion: MeritListItem | null
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  private groq: Groq;

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
    private readonly connection: Connection,
    @Inject('AssignmentStorage') private readonly storage: AssignmentStorage,
  ) {
    // Initialize Groq SDK
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      // Simple text extraction from buffer
      const text = buffer.toString('utf8');
      // Remove non-printable characters and control characters
      return text.replace(/[^\x20-\x7E\n\r]/g, '');
    } catch (error) {
      this.logger.error('Text extraction failed:', error);
      return '';
    }
  }

  // Upload an assignment file using pluggable storage and update DB with relative path
  async updateAssignmentRating(id: number, manualRating: number) {
    const assignment = await this.assignmentRepository.findOne({ where: { id } });
    if (!assignment) throw new Error("Assignment not found");

    assignment.manual_rating = manualRating;
    assignment.final_rating = manualRating;

    await this.assignmentRepository.save(assignment);

    return {
      success: true,
      manual_rating: manualRating,
      final_rating: manualRating
    };
  }

  async uploadAssignmentFile(
    assignmentId: number,
    file: MulterFile
  ): Promise<{ assignmentId: number; relativePath: string }> {
    if (!file || !file.buffer) {
      throw new Error('No file buffer provided');
    }

    const assignment = await this.assignmentRepository.findOne({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    const register = await this.registerRepository.findOne({ where: { id: assignment.registerId } });
    if (!register) {
      throw new NotFoundException(`Register with ID ${assignment.registerId} not found`);
    }

    // Save to disk with full location-based path
    const relativePath = await this.storage.saveAssignment(
      assignmentId,
      file.buffer,
      file.originalname,
      {
        state: register.state || 'Unknown',
        district: register.district || 'Unknown',
        mandal: register.mandal || 'Unknown',
        school: register.schoolCorrespondentName || 'Unknown_School',
      },
    );

    // ✅ Also store file in DB so AI can always read it
    assignment.file_path = relativePath;
    assignment.fileType = file.mimetype;
    assignment.fileSize = file.size;
    assignment.fileData = file.buffer;

    await this.assignmentRepository.save(assignment);

    return { assignmentId, relativePath };
  }

  // Debug method to check register data
  private async debugRegisterData(registerId: number) {
    try {
      const register = await this.registerRepository
        .createQueryBuilder('register')
        .select([
          'register.id',
          'register.state',
          'register.district',
          'register.mandal'
        ])
        .where('register.id = :id', { id: registerId })
        .getOne();
      
      this.logger.debug(`Debug Register ${registerId}: ${JSON.stringify(register, null, 2)}`);
      return register;
    } catch (error) {
      this.logger.error(`Error fetching register data: ${error.message}`, error.stack);
      return null;
    }
  }

  async findOne(id: number): Promise<any> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      select: [
        'id', 'registerId', 'fileName', 'fileType', 'fileSize',
        'state', 'district', 'mandal', 'ai_rating', 'manual_rating', 'final_rating', 'createdAt', 'fileData',
        'submissionDate', 'firstName', 'lastName', 'context'
      ]
    });

    if (!assignment) {
      return null;
    }

    const result = { 
      ...assignment,
      register_state: assignment.state,
      register_district: assignment.district,
      register_mandal: assignment.mandal
    } as any;
    
    if (result.fileData) {
      result.fileData = result.fileData.toString('base64');
    }
    
    return result;
  }

  async updateRating(id: number, manualRating: number): Promise<Assignment | null> {
    if (manualRating < 0 || manualRating > 10) {
      throw new Error("Rating must be between 0 and 10");
    }

    const assignment = await this.assignmentRepository.findOne({ where: { id } });
    if (!assignment) return null;

    assignment.manual_rating = manualRating;
    assignment.final_rating = manualRating;

    return await this.assignmentRepository.save(assignment);
  }

  async getMeritList(): Promise<MeritList> {
    try {
      this.logger.log('Fetching optimized merit list with user details...');
      
      // First, let's check if there are any assignments with final_ratings
      const hasRatings = await this.assignmentRepository.createQueryBuilder('a')
        .where('a.final_rating IS NOT NULL')
        .getCount();
      
      if (hasRatings === 0) {
        this.logger.log('No assignments with ratings found');
        return {
          topStatePerformers: [],
          topDistrictPerformers: [],
          topMandalPerformers: [],
          overallChampion: null
        };
      }

      // Get all rated assignments with location data
      const allPerformers = (await this.assignmentRepository
        .createQueryBuilder('a')
        .select([
          'a.id as a_id',
          'a.registerId as a_registerId',
          'a.fileName as a_fileName',
          'a.ai_rating as a_ai_rating',
          'a.manual_rating as a_manual_rating',
          'a.final_rating as a_final_rating',
          'a.state as a_registerState',
          'a.district as a_registerDistrict',
          'a.mandal as a_registerMandal',
          'a.context as a_context',
          'r.first_name as register_first_name',
          'r.last_name as register_last_name',
          'r.email as r_email',
          'r.state as r_state',
          'r.district as r_district',
          'r.mandal as r_mandal'
        ])
        .leftJoin('a.register', 'r')
        .where('a.final_rating IS NOT NULL')
        .orderBy('a.final_rating', 'DESC')
        .getRawMany())
        .map(rawPerformer => {
          // Create a clean performer object with proper field mapping
          const performer = {
            id: rawPerformer.a_id,
            register_id: rawPerformer.a_registerId,
            file_name: rawPerformer.a_fileName,
            ai_rating: rawPerformer.a_ai_rating ? parseFloat(rawPerformer.a_ai_rating) : null,
            manual_rating: rawPerformer.a_manual_rating ? parseFloat(rawPerformer.a_manual_rating) : null,
            final_rating: parseFloat(rawPerformer.a_final_rating),
            state: rawPerformer.a_registerState || rawPerformer.r_state || null,
            district: rawPerformer.a_registerDistrict || rawPerformer.r_district || null,
            mandal: rawPerformer.a_registerMandal || rawPerformer.r_mandal || null,
            context: rawPerformer.a_context,
            firstName: rawPerformer.register_first_name || '',
            lastName: rawPerformer.register_last_name || '',
            register: {
              email: rawPerformer.r_email
            }
          };
          
          this.logger.debug('Mapped performer data:', performer);
          return performer;
        });

      this.logger.log(`Found ${allPerformers.length} rated performers`);
      
      if (allPerformers.length === 0) {
        this.logger.log('No performers found');
        return { 
          topStatePerformers: [],
          topDistrictPerformers: [],
          topMandalPerformers: [],
          overallChampion: null
        };
      }

      // Get top 3 overall performers (for states)
      const topStatePerformers = allPerformers.slice(0, 3).map(performer => ({
        state: performer.state || 'N/A',
        records: [{
          id: performer.id,
          register_id: performer.register_id,
          file_name: performer.file_name,
          ai_rating: performer.ai_rating,
          manual_rating: performer.manual_rating,
          final_rating: performer.final_rating,
          state: performer.state,
          district: performer.district,
          mandal: performer.mandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }]
      }));

      // Group by district and get top 3 districts with their top performers
      const districts = new Map<string, any[]>();
      allPerformers.forEach(performer => {
        const district = performer.district;
        if (!district) return;
        if (!districts.has(district)) {
          districts.set(district, []);
        }
        if (districts.get(district)!.length < 3) {
          districts.get(district)!.push(performer);
        }
      });

      const topDistrictPerformers = Array.from(districts.entries()).slice(0, 3).map(([district, performers]) => ({
        district,
        records: performers.map(performer => ({
          id: performer.id,
          register_id: performer.register_id,
          file_name: performer.file_name,
          ai_rating: performer.ai_rating,
          manual_rating: performer.manual_rating,
          final_rating: performer.final_rating,
          state: performer.state,
          district: performer.district,
          mandal: performer.mandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }))
      }));

      // Group by mandal and get top 3 mandals with their top performers
      const mandals = new Map<string, any[]>();
      allPerformers.forEach(performer => {
        const mandal = performer.mandal;
        if (!mandal) return;
        if (!mandals.has(mandal)) {
          mandals.set(mandal, []);
        }
        if (mandals.get(mandal)!.length < 3) {
          mandals.get(mandal)!.push(performer);
        }
      });

      const topMandalPerformers = Array.from(mandals.entries()).slice(0, 3).map(([mandal, performers]) => ({
        mandal,
        records: performers.map(performer => ({
          id: performer.id,
          register_id: performer.register_id,
          file_name: performer.file_name,
          ai_rating: performer.ai_rating,
          manual_rating: performer.manual_rating,
          final_rating: performer.final_rating,
          state: performer.state,
          district: performer.district,
          mandal: performer.mandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }))
      }));

      // The overall champion is the first in the all performers list
      const overallChampion = allPerformers[0] ? {
        id: allPerformers[0].id,
        register_id: allPerformers[0].register_id,
        state: allPerformers[0].state,
        district: allPerformers[0].district,
        mandal: allPerformers[0].mandal,
        first_name: allPerformers[0].firstName,
        last_name: allPerformers[0].lastName,
        user_email: allPerformers[0].register?.email || 'N/A',
        file_name: allPerformers[0].file_name,
        ai_rating: allPerformers[0].ai_rating,
        manual_rating: allPerformers[0].manual_rating,
        final_rating: allPerformers[0].final_rating,
        context: allPerformers[0].context
      } : null;

      return {
        topStatePerformers,
        topDistrictPerformers,
        topMandalPerformers,
        overallChampion
      };
    } catch (error) {
      this.logger.error('Error in getMeritList:', error);
      throw new Error('Failed to fetch merit list');
    }
  }

  private async getTopByField(field: 'registerState' | 'registerDistrict' | 'registerMandal'): Promise<Assignment[]> {
    try {
      // Map the field to the correct column name in the database
      const columnMap = {
        'registerState': 'register_state',
        'registerDistrict': 'register_district',
        'registerMandal': 'register_mandal'
      };
      
      const columnName = columnMap[field] || 'register_state';
      
      // Use query builder for more control over the SQL
      return await this.assignmentRepository
        .createQueryBuilder('assignment')
        .where('assignment.rating IS NOT NULL')
        .orderBy('assignment.rating', 'DESC')
        .addOrderBy(`assignment.${columnName}`, 'ASC')
        .take(3)
        .getMany();
    } catch (error) {
      this.logger.error(`Error in getTopByField(${field}):`, error);
      return [];
    }
  }

  async createAssignment(
    data: any,
    file: MulterFile
  ): Promise<{ message: string; assignment: AssignmentResponse }> {
    this.logger.log('Starting createAssignment with data:', { registerId: data.register_id || data.registerId, fileName: file?.originalname });
    
    const registerId = Number(data.register_id || data.registerId);
    if (!registerId) {
      throw new NotFoundException('register_id is required');
    }

    // Start a transaction to ensure data consistency
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Fetching register with ID: ${registerId}`);
      
      // 1. First, get the register data with a lock to prevent concurrent modifications
      const register = await queryRunner.manager
        .createQueryBuilder(Register, 'register')
        .setLock('pessimistic_write')
        .where('register.id = :id', { id: registerId })
        .getOne();

      if (!register) {
        throw new NotFoundException(`Register record not found for ID ${registerId}`);
      }

      this.logger.log('Register data:', {
        id: register.id,
        state: register.state,
        district: register.district,
        mandal: register.mandal,
        firstName: register.firstName,
        lastName: register.lastName
      });

      // 2. Verify required location data exists in register
      if (!register.state || !register.district || !register.mandal) {
        const errorMsg = `Register is missing required location data (state: ${register.state}, district: ${register.district}, mandal: ${register.mandal})`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // 3. Create and save assignment with explicit field mapping
      const assignment = new Assignment();
      
      // Set basic file information
      assignment.registerId = registerId;
      assignment.fileName = file.originalname;

      if (!file.buffer) {
        throw new Error('File buffer is empty');
      }

      // ✅ Store PDF in DB so AI can always read it (even if disk is wiped)
      assignment.fileData = file.buffer;
      assignment.fileSize = file.size;
      assignment.fileType = file.mimetype;
      assignment.context = data.context || null;
      
      // Explicitly set location data from register with null checks and trimming
      // Using the correct property names that match the database columns
      assignment.state = register.state ? String(register.state).trim() : null;
      assignment.district = register.district ? String(register.district).trim() : null;
      assignment.mandal = register.mandal ? String(register.mandal).trim() : null;
      
      // Log the register data for debugging
      this.logger.log('Register source data:', {
        registerId: register.id,
        state: register.state,
        district: register.district,
        mandal: register.mandal,
        firstName: register.firstName,
        lastName: register.lastName
      });
      
      // Log the assignment data before saving
      this.logger.log('Assignment data being saved:', {
        state: assignment.state,
        district: assignment.district,
        mandal: assignment.mandal,
        firstName: assignment.firstName,
        lastName: assignment.lastName
      });
      
      // Set user information from register
      assignment.firstName = register.firstName ? String(register.firstName).trim() : null;
      assignment.lastName = register.lastName ? String(register.lastName).trim() : null;
      
      // Log the assignment data before saving
      this.logger.log('Assignment data before save:', {
        registerId: assignment.registerId,
        state: assignment.state,
        district: assignment.district,
        mandal: assignment.mandal,
        firstName: assignment.firstName,
        lastName: assignment.lastName
      });
      
      // Set timestamps
      const now = new Date();
      assignment.submissionDate = now;
      assignment.createdAt = now;
      
      // Log the complete assignment object before saving
      this.logger.log('Complete assignment object before save:', JSON.stringify(assignment, null, 2));
      
      // Log the assignment data before saving
      this.logger.log('Creating assignment with data:', {
        registerId: assignment.registerId,
        state: assignment.state,
        district: assignment.district,
        mandal: assignment.mandal,
        firstName: assignment.firstName,
        lastName: assignment.lastName,
        context: assignment.context
      });

      this.logger.log('Creating assignment with data:', {
        registerId: assignment.registerId,
        state: assignment.state,
        district: assignment.district,
        mandal: assignment.mandal,
        context: assignment.context
      });

      // 4. Save the assignment within the transaction using repository
      // First log the complete assignment object
      this.logger.log('Complete assignment object before save:', JSON.stringify({
        registerId: assignment.registerId,
        fileName: assignment.fileName,
        fileSize: assignment.fileSize,
        fileType: assignment.fileType,
        context: assignment.context,
        state: assignment.state,
        district: assignment.district,
        mandal: assignment.mandal,
        firstName: assignment.firstName,
        lastName: assignment.lastName,
        submissionDate: assignment.submissionDate,
        createdAt: assignment.createdAt
      }, null, 2));

      // Save the assignment first to get an ID
      const savedAssignment = await queryRunner.manager
        .getRepository(Assignment)
        .save(assignment);
        
      // Save the file using the storage service (with location-based folders)
      try {
        const filePath = await this.storage.saveAssignment(
          savedAssignment.id,
          file.buffer,
          file.originalname,
          {
            state: register.state || 'Unknown',
            district: register.district || 'Unknown',
            mandal: register.mandal || 'Unknown',
            school: register.schoolCorrespondentName || 'Unknown_School',
          },
        );

        // Update the assignment with the file path (for browsing / tree)
        savedAssignment.file_path = filePath;

        // ✅ Keep DB fileData as well (already set above)
        await queryRunner.manager.getRepository(Assignment).save(savedAssignment);
      } catch (storageError) {
        this.logger.error('Failed to save file to storage:', storageError);
        throw new Error('Failed to save assignment file');
      }
        
      // Log the saved assignment data
      this.logger.log('Saved assignment data:', {
        id: savedAssignment.id,
        registerId: savedAssignment.registerId,
        state: savedAssignment.state,
        district: savedAssignment.district,
        mandal: savedAssignment.mandal,
        firstName: savedAssignment.firstName,
        lastName: savedAssignment.lastName
      });
      this.logger.log('Assignment saved with ID:', savedAssignment.id);
      
      // Log the saved assignment data
      this.logger.log('Saved assignment data (from save result):', {
        id: savedAssignment.id,
        state: savedAssignment.state,
        district: savedAssignment.district,
        mandal: savedAssignment.mandal,
        registerId: savedAssignment.registerId
      });
      
      // 5. Verify the saved data with explicit column selection
      const verifiedAssignment = await queryRunner.manager
        .createQueryBuilder(Assignment, 'assignment')
        .select([
          'assignment.id',
          'assignment.registerId',
          'assignment.registerState',
          'assignment.registerDistrict',
          'assignment.registerMandal',
          'assignment.fileName',
          'assignment.ai_rating',
          'assignment.manual_rating',
          'assignment.final_rating',
          'assignment.context',
          'assignment.firstName',
          'assignment.lastName'
        ])
        .where('assignment.id = :id', { id: savedAssignment.id })
        .getOne();

      if (!verifiedAssignment) {
        throw new Error('Failed to verify saved assignment');
      }
      
      // 6. Commit the transaction
      await queryRunner.commitTransaction();
      this.logger.log('Transaction committed successfully');
      
      // 7. Log the final verified data
      this.logger.log('Verified assignment data from database:', {
        id: verifiedAssignment.id,
        state: verifiedAssignment.state,
        district: verifiedAssignment.district,
        mandal: verifiedAssignment.mandal,
        registerId: verifiedAssignment.registerId,
        fileName: verifiedAssignment.fileName,
        ai_rating: verifiedAssignment.ai_rating,
        manual_rating: verifiedAssignment.manual_rating,
        final_rating: verifiedAssignment.final_rating,
        context: verifiedAssignment.context,
        firstName: verifiedAssignment.firstName,
        lastName: verifiedAssignment.lastName
      });

      this.logger.log('Verified assignment data:', {
        id: verifiedAssignment.id,
        state: verifiedAssignment.state,
        district: verifiedAssignment.district,
        mandal: verifiedAssignment.mandal,
        registerId: verifiedAssignment.registerId
      });

      // 8. Start AI analysis in the background (don't wait for it to complete)
      this.analyzeAssignmentWithAI(savedAssignment.id, data.context || '')
        .catch(error => {
          this.logger.error(`Error in background AI analysis: ${error.message}`, error.stack);
        });

      // 9. Return the saved assignment data with all location fields
      const response = {
        message: 'Assignment submitted successfully',
        assignment: {
          id: savedAssignment.id,
          register_id: savedAssignment.registerId,
          state: savedAssignment.state,
          district: savedAssignment.district,
          mandal: savedAssignment.mandal,
          context: savedAssignment.context,
          ai_rating: savedAssignment.ai_rating,
          manual_rating: savedAssignment.manual_rating,
          final_rating: savedAssignment.final_rating,
          fileName: savedAssignment.fileName,
          fileType: savedAssignment.fileType,
          fileSize: savedAssignment.fileSize,
          firstName: savedAssignment.firstName,
          lastName: savedAssignment.lastName,
          submissionDate: savedAssignment.submissionDate,
          // For backward compatibility
          register_state: savedAssignment.state,
          register_district: savedAssignment.district,
          register_mandal: savedAssignment.mandal
        }
      };
      
      // Log the final response being sent back
      this.logger.log('Final API response with assignment data:', JSON.stringify(response, null, 2));
      
      this.logger.log('Returning response:', response);
      return response;
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error('Error creating assignment:', error);
      
      // Log the error details for debugging
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`, error.stack);
      } else {
        this.logger.error('Unknown error occurred:', error);
      }
      
      throw error;
      throw new Error(`Failed to create assignment: ${error.message}. Please ensure the register has valid location data.`);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  // Simple fallback rating if Ollama is not available
  private getFallbackRating() {
    const rating = Math.floor(Math.random() * 4) + 6; // Random rating between 6-9
    return {
      ai_rating: rating,
      final_rating: rating,
      reason: 'Assigned a default rating as the AI service is currently unavailable.',
      isFallback: true
    };
  }

  // Handle fallback rating when AI service is unavailable
  private async handleFallbackRating(id: number, context: string, error: Error) {
    this.logger.warn(`⚠️ Using fallback rating due to: ${error.message}`);
    const fallback = this.getFallbackRating();
    
    try {
      // Update the assignment with fallback rating
      const assignment = await this.assignmentRepository.findOne({ where: { id } });
      if (assignment) {
        assignment.ai_rating = fallback.ai_rating;
        assignment.final_rating = assignment.manual_rating ?? fallback.final_rating;
        await this.assignmentRepository.save(assignment);
      }
      
      return {
        success: true,
        ai_rating: fallback.ai_rating,
        final_rating: fallback.final_rating,
        reason: fallback.reason,
        context,
        message: `AI service unavailable. Used fallback rating: ${fallback.final_rating}/10`,
        isFallback: true
      };
    } catch (dbError) {
      this.logger.error('❌ Failed to save fallback rating:', dbError);
      throw new Error(`Failed to analyze assignment: ${error.message}`);
    }
  }

  // Fix corrupted buffer from PostgreSQL
  private fixPgByteA(data: Buffer | string | null): Buffer | null {
    if (!data) return null;

    // Postgres BYTEA returns as string: "\\x25504446..."
    if (typeof data === "string" && data.startsWith("\\x")) {
      return Buffer.from(data.replace("\\x", ""), "hex");
    }

    // Already a buffer
    if (Buffer.isBuffer(data)) {
      return Buffer.from(data);
    }

    // Any other string
    return Buffer.from(data);
  }

  async analyzeAssignmentWithAI(id: number, context: string = "") {
    try {
      // 1. Fetch assignment
      const assignment = await this.assignmentRepository.findOne({
        where: { id },
        select: ["id", "fileData", "file_path", "fileType", "manual_rating", "ai_rating", "final_rating"]
      });

      if (!assignment) throw new Error("Assignment not found");

      // 2. Load PDF buffer
      let buffer: Buffer | null = null;

      if (assignment.fileData) {
        buffer = this.fixPgByteA(assignment.fileData);
      } else if (assignment.file_path) {
        const diskData = await this.storage.getFile(assignment.file_path);
        buffer = this.fixPgByteA(diskData);
      }

      if (!buffer || buffer.length === 0) {
        throw new Error("File buffer empty or corrupted");
      }

      // 3. Extract text
      let extractedText = "";

      if (assignment.fileType?.includes("pdf")) {
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text?.trim() ?? "";
        this.logger.debug(`✅ Extracted ${extractedText.length} characters from PDF`);
      } else {
        extractedText = buffer.toString("utf8").trim();
      }

      if (extractedText.length < 20) {
        throw new Error("Text extraction failed or too short");
      }

      // 4. Call Groq using official SDK
      this.logger.log('Calling Groq API with text length:', extractedText.length);
      
      // 5. Call Groq API with recommended settings
      const groqResponse = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: `Rate this student's assignment strictly from 0 to 10.
            Return ONLY valid JSON:
            {"rating": <number>}
            
            Text:
            ${extractedText.substring(0, 15000)}`
          }
        ]
      });

      const content = groqResponse.choices?.[0]?.message?.content?.trim();
      this.logger.log('Received AI response:', content);

      if (!content) {
        throw new Error("Empty response from AI service");
      }

      // 5. Parse the response
      let rating: number;
      try {
        const result = JSON.parse(content);
        rating = parseFloat(result.rating);
        
        if (isNaN(rating) || rating < 0 || rating > 10) {
          throw new Error(`Invalid rating value: ${result.rating}`);
        }
      } catch (error) {
        this.logger.error(`Failed to parse AI response: ${content}`, error);
        return this.handleFallbackRating(id, context, new Error(`Invalid AI response format: ${error.message}`));
      }

      // 6. Save rating
      assignment.ai_rating = rating;
      assignment.final_rating = assignment.manual_rating ?? rating;

      await this.assignmentRepository.save(assignment);

      return {
        success: true,
        ai_rating: rating,
        final_rating: assignment.final_rating,
      };

    } catch (err) {
      this.logger.error("Groq AI error:", err);
      throw new InternalServerErrorException({
        message: "AI analysis failed",
        error: err.message,
      });
    }
  }
}