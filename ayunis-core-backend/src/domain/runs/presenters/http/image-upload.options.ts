import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { TotalSizeLimitedMemoryStorage } from './total-size-limited-memory.storage';
import { ImageUploadAdmission } from './image-upload-admission';
import {
  MAX_CONCURRENT_IMAGE_UPLOADS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  MAX_TOTAL_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from './image-upload.constants';

export const IMAGE_UPLOAD_ADMISSION = new ImageUploadAdmission(
  MAX_CONCURRENT_IMAGE_UPLOADS,
);

export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  storage: new TotalSizeLimitedMemoryStorage(
    MAX_TOTAL_SIZE_BYTES,
    IMAGE_UPLOAD_ADMISSION,
  ),
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
