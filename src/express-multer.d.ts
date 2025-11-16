// This file extends the Express namespace to include Multer types

import * as multer from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File extends multer.File {}
    }
  }
}
