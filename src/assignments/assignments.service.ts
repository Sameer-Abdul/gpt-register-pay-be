import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, Not, IsNull, getConnection } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { Register } from '../register/entities/register.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Using dynamic import for pdf-parse to handle ESM
import { Ollama } from 'ollama';

// Define response interfaces
export interface AssignmentResponse {
  id: number;
  register_id: number;
  registerState: string | null;
  registerDistrict: string | null;
  registerMandal: string | null;
  context: string | null;
  rating?: number;
}

export interface MeritListItem {
  id: number;
  register_id: number;
  file_name: string;
  rating: number;
  registerState?: string | null;
  registerDistrict?: string | null;
  registerMandal?: string | null;
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
  topStatePerformers: Array<{ state: string; records: MeritListItem[] }>;
  topDistrictPerformers: Array<{ district: string; records: MeritListItem[] }>;
  topMandalPerformers: Array<{ mandal: string; records: MeritListItem[] }>;
  overallChampion: MeritListItem | null;
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Register)
    private readonly registerRepository: Repository<Register>,
    private readonly connection: Connection,
  ) {}

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
        'registerState', 'registerDistrict', 'registerMandal', 'rating', 'createdAt', 'fileData',
        'submissionDate', 'firstName', 'lastName', 'context'
      ]
    });

    if (!assignment) {
      return null;
    }

    const result = { 
      ...assignment,
      register_state: assignment.registerState,
      register_district: assignment.registerDistrict,
      register_mandal: assignment.registerMandal
    } as any;
    
    if (result.fileData) {
      result.fileData = result.fileData.toString('base64');
    }
    
    return result;
  }

  async updateRating(id: number, rating: number): Promise<Assignment | null> {
    if (rating < 0 || rating > 10) {
      throw new Error('Rating must be between 0 and 10');
    }

    const assignment = await this.assignmentRepository.findOne({ 
      where: { id },
      select: ['id', 'registerId', 'fileName', 'fileType', 'fileSize', 'rating',
        'registerState', 'registerDistrict', 'registerMandal', 'createdAt',
        'submissionDate', 'firstName', 'lastName', 'context']
    });
    
    if (!assignment) {
      return null;
    }

    assignment.rating = rating;
    const updatedAssignment = await this.assignmentRepository.save(assignment);
    
    const result = { 
      ...updatedAssignment,
      register_state: updatedAssignment.registerState,
      register_district: updatedAssignment.registerDistrict,
      register_mandal: updatedAssignment.registerMandal
    } as any;
    
    if (result.fileData) {
      result.fileData = result.fileData.toString('base64');
    }
    
    return result;
  }

  async getMeritList(): Promise<MeritList> {
    try {
      this.logger.log('Fetching optimized merit list with user details...');
      
      // First, let's check if there are any assignments with ratings
      const hasRatings = await this.assignmentRepository.createQueryBuilder('a')
        .where('a.rating IS NOT NULL')
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
          'a.rating as a_rating',
          'a.registerState as a_registerState',
          'a.registerDistrict as a_registerDistrict',
          'a.registerMandal as a_registerMandal',
          'a.context as a_context',
          'r.first_name as register_first_name',
          'r.last_name as register_last_name',
          'r.email as r_email',
          'r.state as r_state',
          'r.district as r_district',
          'r.mandal as r_mandal'
        ])
        .leftJoin('a.register', 'r')
        .where('a.rating IS NOT NULL')
        .orderBy('a.rating', 'DESC')
        .getRawMany())
        .map(rawPerformer => {
          // Create a clean performer object with proper field mapping
          const performer = {
            id: rawPerformer.a_id,
            registerId: rawPerformer.a_registerId,
            fileName: rawPerformer.a_fileName,
            rating: parseFloat(rawPerformer.a_rating),
            registerState: rawPerformer.a_registerState || rawPerformer.r_state || null,
            registerDistrict: rawPerformer.a_registerDistrict || rawPerformer.r_district || null,
            registerMandal: rawPerformer.a_registerMandal || rawPerformer.r_mandal || null,
            context: rawPerformer.a_context,
            firstName: rawPerformer.register_first_name || '',
            lastName: rawPerformer.register_last_name || '',
            register: {
              email: rawPerformer.r_email
            },
            // Backward compatibility
            state: rawPerformer.a_registerState || rawPerformer.r_state || null,
            district: rawPerformer.a_registerDistrict || rawPerformer.r_district || null,
            mandal: rawPerformer.a_registerMandal || rawPerformer.r_mandal || null
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
        state: performer.registerState || 'N/A',
        records: [{
          id: performer.id,
          register_id: performer.registerId,
          file_name: performer.fileName,
          rating: performer.rating,
          registerState: performer.registerState,
          registerDistrict: performer.registerDistrict,
          registerMandal: performer.registerMandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }]
      }));

      // Group by district and get top 3 districts with their top performers
      const districts = new Map<string, any[]>();
      allPerformers.forEach(performer => {
        if (!performer.registerDistrict) return;
        if (!districts.has(performer.registerDistrict)) {
          districts.set(performer.registerDistrict, []);
        }
        if (districts.get(performer.registerDistrict)!.length < 3) {
          districts.get(performer.registerDistrict)!.push(performer);
        }
      });

      const topDistrictPerformers = Array.from(districts.entries()).slice(0, 3).map(([district, performers]) => ({
        district,
        records: performers.map(performer => ({
          id: performer.id,
          register_id: performer.registerId,
          file_name: performer.fileName,
          rating: performer.rating,
          registerState: performer.registerState,
          registerDistrict: performer.registerDistrict,
          registerMandal: performer.registerMandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }))
      }));

      // Group by mandal and get top 3 mandals with their top performers
      const mandals = new Map<string, any[]>();
      allPerformers.forEach(performer => {
        if (!performer.registerMandal) return;
        if (!mandals.has(performer.registerMandal)) {
          mandals.set(performer.registerMandal, []);
        }
        if (mandals.get(performer.registerMandal)!.length < 3) {
          mandals.get(performer.registerMandal)!.push(performer);
        }
      });

      const topMandalPerformers = Array.from(mandals.entries()).slice(0, 3).map(([mandal, performers]) => ({
        mandal,
        records: performers.map(performer => ({
          id: performer.id,
          register_id: performer.registerId,
          file_name: performer.fileName,
          rating: performer.rating,
          registerState: performer.registerState,
          registerDistrict: performer.registerDistrict,
          registerMandal: performer.registerMandal,
          first_name: performer.firstName,
          last_name: performer.lastName,
          user_email: performer.register?.email || 'N/A',
          context: performer.context
        }))
      }));

      // The overall champion is the first in the all performers list
      const overallChampion = allPerformers[0] ? {
        id: allPerformers[0].id,
        register_id: allPerformers[0].registerId,
        registerState: allPerformers[0].registerState,
        registerDistrict: allPerformers[0].registerDistrict,
        registerMandal: allPerformers[0].registerMandal,
        first_name: allPerformers[0].firstName,
        last_name: allPerformers[0].lastName,
        user_email: allPerformers[0].register?.email || 'N/A',
        file_name: allPerformers[0].fileName,
        rating: allPerformers[0].rating,
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
    file: Express.Multer.File
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
      assignment.fileData = file.buffer;
      assignment.fileSize = file.size;
      assignment.fileType = file.mimetype;
      assignment.context = data.context || null;
      
      // Explicitly set location data from register with null checks
      assignment.registerState = register.state || null;
      assignment.registerDistrict = register.district || null;
      assignment.registerMandal = register.mandal || null;
      
      // Log the register data for debugging
      this.logger.log('Register location data:', {
        state: register.state,
        district: register.district,
        mandal: register.mandal
      });
      
      // Log the assignment data before saving
      this.logger.log('Assignment location data before save:', {
        registerState: assignment.registerState,
        registerDistrict: assignment.registerDistrict,
        registerMandal: assignment.registerMandal
      });
      
      // Set user information
      assignment.firstName = register.firstName || null;
      assignment.lastName = register.lastName || null;
      
      // Set timestamps
      const now = new Date();
      assignment.submissionDate = now;
      assignment.createdAt = now;
      
      // Log the assignment data before saving
      this.logger.log('Creating assignment with data:', {
        registerId: assignment.registerId,
        registerState: assignment.registerState,
        registerDistrict: assignment.registerDistrict,
        registerMandal: assignment.registerMandal,
        firstName: assignment.firstName,
        lastName: assignment.lastName,
        context: assignment.context
      });

      this.logger.log('Creating assignment with data:', {
        registerId: assignment.registerId,
        registerState: assignment.registerState,
        registerDistrict: assignment.registerDistrict,
        registerMandal: assignment.registerMandal,
        context: assignment.context
      });

      // 4. Save the assignment within the transaction using repository
      const savedAssignment = await queryRunner.manager.getRepository(Assignment).save(assignment);
      this.logger.log('Assignment saved with ID:', savedAssignment.id);
      
      // Log the saved assignment data
      this.logger.log('Saved assignment data:', {
        id: savedAssignment.id,
        registerState: savedAssignment.registerState,
        registerDistrict: savedAssignment.registerDistrict,
        registerMandal: savedAssignment.registerMandal,
        registerId: savedAssignment.registerId
      });
      
      // 5. Verify the saved data
      const verifiedAssignment = await queryRunner.manager
        .createQueryBuilder(Assignment, 'assignment')
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
        registerState: verifiedAssignment.registerState,
        registerDistrict: verifiedAssignment.registerDistrict,
        registerMandal: verifiedAssignment.registerMandal,
        registerId: verifiedAssignment.registerId
      });

      this.logger.log('Verified assignment data:', {
        id: verifiedAssignment.id,
        registerState: verifiedAssignment.registerState,
        registerDistrict: verifiedAssignment.registerDistrict,
        registerMandal: verifiedAssignment.registerMandal,
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
          registerState: savedAssignment.registerState,
          registerDistrict: savedAssignment.registerDistrict,
          registerMandal: savedAssignment.registerMandal,
          context: savedAssignment.context,
          rating: savedAssignment.rating,
          // For backward compatibility
          state: savedAssignment.registerState,
          district: savedAssignment.registerDistrict,
          mandal: savedAssignment.registerMandal
        }
      };
      
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
      rating,
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
        assignment.rating = fallback.rating;
        await this.assignmentRepository.save(assignment);
      }
      
      return {
        assignmentId: id,
        aiRating: fallback.rating,
        reason: fallback.reason,
        context,
        message: `AI service unavailable. Used fallback rating: ${fallback.rating}/10`,
        isFallback: true
      };
    } catch (dbError) {
      this.logger.error('❌ Failed to save fallback rating:', dbError);
      throw new Error(`Failed to analyze assignment: ${error.message}`);
    }
  }

  async analyzeAssignmentWithAI(id: number, context: string) {
    this.logger.log(`🧠 Starting AI analysis for assignment ${id} with context "${context}"`);
    
    try {
      // 1️⃣ Fetch the assignment record with error handling
      const assignment = await this.assignmentRepository.findOne({ 
        where: { id },
        select: [
          'id', 
          'fileData', 
          'registerId', 
          'registerState', 
          'registerDistrict', 
          'registerMandal', 
          'rating',
          'firstName',
          'lastName',
          'context'
        ]
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment with ID ${id} not found`);
      }

      // 2️⃣ Extract text from PDF
      if (!assignment.fileData) {
        throw new Error('No file data available for analysis');
      }

      const pdfText = await this.extractTextFromPdf(assignment.fileData);
      if (!pdfText) {
        throw new Error('Failed to extract text from PDF');
      }

      // 3️⃣ Call Ollama for analysis
      const ollama = new Ollama({ host: 'http://localhost:11434' });
      
      // Get available models
      const availableModels = await ollama.list();
      if (!availableModels.models || availableModels.models.length === 0) {
        throw new Error('No models available. Please install a model first.');
      }

      // Select the best available model
      const preferredModels = ['gemma:2b', 'gemma:4b', 'llama3:4b', 'llama3:latest'];
      const modelToUse = preferredModels.find(model => 
        availableModels.models.some((m: any) => m.name === model)
      ) || availableModels.models[0].name;

      this.logger.log(`🤖 Using model: ${modelToUse}`);

      // 4️⃣ Generate prompt and get response
      const locationInfo = [
        assignment.registerState ? `State: ${assignment.registerState}` : '',
        assignment.registerDistrict ? `District: ${assignment.registerDistrict}` : '',
        assignment.registerMandal ? `Mandal: ${assignment.registerMandal}` : ''
      ].filter(Boolean).join(', ');

      const prompt = `Analyze the following assignment and provide a rating from 1-10 based on relevance to the context:
      
Context: ${context}

Location: ${locationInfo || 'Not specified'}
Student: ${assignment.firstName || ''} ${assignment.lastName || ''}

Assignment Content:
${pdfText.substring(0, 2000)}...

Please respond with a JSON object containing:
- rating: number (1-10)
- reason: string (brief explanation)`;

      this.logger.log(`📝 Prompt length: ${prompt.length} chars`);
      
      // Make the API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
      
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Ollama API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        // 5️⃣ Parse and validate response
        let aiResult;
        try {
          aiResult = typeof data === 'string' ? JSON.parse(data) : data;
          if (typeof aiResult.rating !== 'number' || !aiResult.reason) {
            throw new Error('Invalid response format from AI');
          }
        } catch (e) {
          throw new Error(`Failed to parse AI response: ${e.message}`);
        }

        // 6️⃣ Update assignment with rating
        assignment.rating = aiResult.rating;
        await this.assignmentRepository.save(assignment);

        // 7️⃣ Return response
        return {
          assignmentId: id,
          aiRating: aiResult.rating,
          reason: aiResult.reason,
          context,
          message: `AI rated assignment ${aiResult.rating}/10 for context relevance.`
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      this.logger.error(`❌ Error in analyzeAssignmentWithAI: ${error.message}`, error.stack);
      return this.handleFallbackRating(id, context, error);
    }
  }
// Add this at the end of the file
}