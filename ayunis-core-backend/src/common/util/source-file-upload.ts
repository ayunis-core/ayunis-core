import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

export const MAX_SOURCE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Shape multer produces for disk-stored source uploads (no buffer — disk storage only sets path). */
export interface UploadedSourceFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  path: string;
}

/** The subset of an uploaded file that source-creation flows need. */
export type UploadedFileRef = Pick<
  UploadedSourceFile,
  'originalname' | 'mimetype' | 'path'
>;

// Swallows unlink errors so cleanup in a finally block can never mask the
// request's real outcome.
export function removeUploadedFile(path: string): void {
  try {
    fs.unlinkSync(path);
  } catch {
    // e.g. ENOENT when the file was already removed
  }
}

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
  // Browsers send the multipart filename as raw UTF-8 bytes; busboy defaults to
  // latin1, which garbles umlauts and other non-ASCII characters into mojibake.
  defParamCharset: 'utf8',
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
