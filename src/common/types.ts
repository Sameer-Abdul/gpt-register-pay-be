// Import the Express types
import { Express } from 'express';

// Define the base interface for file properties
interface BaseFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  [key: string]: any;
}

// Export the MulterFile type
export type MulterFile = BaseFile;

// Extend the Express.Multer namespace
declare global {
  namespace Express {
    namespace Multer {
      // This tells TypeScript to use our BaseFile interface where Express.Multer.File is used
      interface File extends BaseFile {}
    }
  }
}
