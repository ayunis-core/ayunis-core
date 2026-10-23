import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { TotalSizeLimitedMemoryStorage } from './total-size-limited-memory.storage';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  MAX_TOTAL_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from './image-upload.constants';

export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  storage: new TotalSizeLimitedMemoryStorage(MAX_TOTAL_SIZE_BYTES),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_IMAGES },
  fileFilter: (_request, file, callback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) callback(null, true);
    else
      callback(
        new BadRequestException(`Invalid file type: ${file.mimetype}`),
        false,
      );
  },
};
