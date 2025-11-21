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
    }
  ): Promise<string> {
    const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';
    const baseDir = path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
    
    // Default to 'Unknown' if meta is not provided for backward compatibility
    const state = meta?.state || 'Unknown';
    const district = meta?.district || 'Unknown';
    const mandal = meta?.mandal || 'Unknown';
    const school = meta?.school || 'Unknown_School';

    // Sanitize all path segments
    const sanitizedState = sanitizeSegment(state);
    const sanitizedDistrict = sanitizeSegment(district);
    const sanitizedMandal = sanitizeSegment(mandal);
    const sanitizedSchool = sanitizeSegment(school);

    // Create a directory structure based on location
    const dir = path.join(
      baseDir,
      sanitizedState,
      sanitizedDistrict,
      sanitizedMandal,
      sanitizedSchool,
      assignmentId.toString()
    );
    
    await fs.mkdir(dir, { recursive: true });

    // Generate a safe filename with the original extension
    const ext = path.extname(originalName || '') || '';
    const baseName = sanitizeSegment(path.basename(originalName || 'assignment', ext));
    const safeFileName = `${baseName}${ext}`;
    const fullPath = path.join(dir, safeFileName);

    await fs.writeFile(fullPath, file);

    // Return the relative path
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
