import { Express } from 'express';

export type MulterFile = Express.Multer.File & {
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
  [key: string]: any; // For any additional properties that might be present
};

declare global {
  namespace Express {
    namespace Multer {
      interface File extends MulterFile {}
    }
  }
}
