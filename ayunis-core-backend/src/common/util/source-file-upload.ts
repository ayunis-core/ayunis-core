import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/** Default upload limit; `UPLOAD_MAX_FILE_SIZE_BYTES` overrides it per deployment. */
export const DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;

// Hard processing byte ceiling for the configurable limit: the pipeline still
// buffers each file whole in the API and in the worker, converts Office files
// through Gotenberg before the page check, and chunks and embeds every byte of
// text, so this bounds that shared cost for every file type. Raising it is a
// decision for the streaming extraction service (AYC-1405).
export const MAX_SOURCE_FILE_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

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
// unlink the file after processing. `limits.fileSize` is the default limit;
// UploadLimitFileInterceptor replaces it with the configured one.
export const SOURCE_FILE_UPLOAD_OPTIONS: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadsPath = path.resolve('./uploads');
      fs.mkdir(uploadsPath, { recursive: true }, (error) => {
        cb(error, uploadsPath);
      });
    },
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES },
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
        description:
          'The file to upload (max 25 MB by default; the deployment can configure the limit)',
      },
    },
    required: ['file'],
  },
};
