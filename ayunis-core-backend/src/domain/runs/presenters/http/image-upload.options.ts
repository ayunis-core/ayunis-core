import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './image-upload.constants';

export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  // eslint-disable-next-line sonarjs/content-length -- multer file size limit, not HTTP header
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`Invalid file type: ${file.mimetype}`), false);
    }
  },
};
