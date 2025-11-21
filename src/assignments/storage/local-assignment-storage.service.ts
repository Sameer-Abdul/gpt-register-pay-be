// src/assignments/storage/local-assignment-storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AssignmentStorage, SaveAssignmentOptions } from './assignment-storage.interface';

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

  async saveAssignment(options: SaveAssignmentOptions): Promise<string> {
    const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';

    const state = sanitizeSegment(`${options.location.state}_State`);
    const mandal = sanitizeSegment(`${options.location.mandal}_Mandal`);
    const district = sanitizeSegment(`${options.location.district}_District`);
    const school = sanitizeSegment(options.location.schoolName || 'School');

    const baseDir = path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
    const targetDir = path.join(baseDir, state, mandal, district, school);

    console.log('[Storage] Base dir:', baseDir);
    console.log('[Storage] Target dir:', targetDir);

    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(options.originalName || '') || '';
    const baseName = sanitizeSegment(path.basename(options.originalName || 'assignment', ext));
    const timestamp = Date.now();
    const safeFileName = `${baseName}_${timestamp}${ext}`;

    const fullPath = path.join(targetDir, safeFileName);
    await fs.writeFile(fullPath, options.buffer);

    console.log('[Storage] Saved file:', fullPath);

    // Return POSIX-style relative path
    const rel = path.relative(baseDir, fullPath).split(path.sep).join('/');
    return rel;
  }

  async getFile(assignmentId: number): Promise<Buffer | null> {
    try {
      const basePath = this.configService.get<string>('ASSIGNMENT_BASE_PATH') || 'assignments';
      const baseDir = path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
      
      // Search for the file in all subdirectories
      const searchDir = path.join(baseDir, '**', `*_${assignmentId}_*`);
      const files = await fs.readdir(path.dirname(searchDir), { recursive: true });
      
      const matchingFile = files.find(file => {
        const fileName = path.basename(file.toString());
        return fileName.includes(`_${assignmentId}_`);
      });

      if (!matchingFile) {
        return null;
      }

      const filePath = path.join(baseDir, matchingFile.toString());
      return await fs.readFile(filePath);
    } catch (error) {
      console.error(`[Storage] Error retrieving file for assignment ${assignmentId}:`, error);
      return null;
    }
  }
}
