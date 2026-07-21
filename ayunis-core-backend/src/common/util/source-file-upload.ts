import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const MAX_SOURCE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Shape multer produces for disk-stored source uploads. */
export interface UploadedSourceFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path: string;
}

/** The subset of an uploaded file that source-creation flows need. */
export type UploadedFileRef = Pick<
  UploadedSourceFile,
  'originalname' | 'mimetype' | 'path'
>;

// Disk storage so a large upload is never buffered whole into heap; callers
// unlink the file after processing.
export const SOURCE_FILE_UPLOAD_OPTIONS: MulterOptions = {
  // eslint-disable-next-line sonarjs/content-length -- multer file size limit, not HTTP Content-Length
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_SOURCE_FILE_SIZE_BYTES },
};

export const SOURCE_FILE_API_BODY = {
  schema: {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'The file to upload (max 25 MB)',
      },
    },
    required: ['file'],
  },
};
