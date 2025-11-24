// src/assignments/storage/local-assignment-storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AssignmentStorage } from './assignment-storage.interface';

function sanitizeSegment(segment: string): string {
  const replaced = (segment || 'Unknown')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_\-\.]/g, '');
  return replaced || 'Unknown';
}

@Injectable()
export class LocalAssignmentStorageService implements AssignmentStorage {
  constructor(private readonly configService: ConfigService) {}

  async saveAssignment(
    assignmentId: number,
    file: Buffer,
    originalName: string,
    meta?: {
      state: string;
      district: string;
      mandal: string;
      school: string;
      context?: string;
    }
  ): Promise<string> {
    const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';
    const baseDir = path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
    
    // Default to 'Unknown' if meta is not provided for backward compatibility
    const state = meta?.state || 'Unknown';
    const district = meta?.district || 'Unknown';
    const mandal = meta?.mandal || 'Unknown';
    const school = meta?.school || 'Unknown_School';
    
    // Use context from DB (assignments table)
    let context = meta?.context;
    
    // If DB context is null/empty → fallback to General
    if (!context || context.trim() === '') {
      context = 'General';
    }

    // Sanitize all path segments by replacing spaces with underscores
    const sanitizedState = state.replace(/\s+/g, '_');
    const sanitizedDistrict = district.replace(/\s+/g, '_');
    const sanitizedMandal = mandal.replace(/\s+/g, '_');
    const sanitizedSchool = school.replace(/\s+/g, '_');
    const sanitizedContext = context.replace(/\s+/g, '_');

    // Create the directory structure: State → District → Mandal → School → Context
    const dir = path.join(
      baseDir,
      sanitizedState,
      sanitizedDistrict,
      sanitizedMandal,
      sanitizedSchool,
      sanitizedContext
    );
    
    // Create directories recursively
    await fs.mkdir(dir, { recursive: true });

    // Generate a safe filename with the original extension
    const ext = path.extname(originalName || '') || '';
    const baseName = path.basename(originalName || 'assignment', ext);
    const safeFileName = `${baseName.replace(/[^\w\-\.]/g, '_')}${ext}`;
    const fullPath = path.join(dir, safeFileName);

    // Write the file
    await fs.writeFile(fullPath, file);

    // Return the relative path with forward slashes for consistency
    return path.relative(baseDir, fullPath).split(path.sep).join('/');
  }

  async getFile(filePath: string): Promise<Buffer | null> {
    try {
      const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';
      const baseDir = path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
      const fullPath = path.join(baseDir, filePath);
      
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error(`[Storage] Error retrieving file ${filePath}:`, error);
      return null;
    }
  }
}
