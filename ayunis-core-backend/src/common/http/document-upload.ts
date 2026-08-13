import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import type { PinoLogger } from 'nestjs-pino';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentSourceFile,
} from 'src/common/util/file-type';

export interface UploadedDocument {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size?: number;
  buffer?: Buffer;
  path: string;
}

const UPLOADS_DIR = './uploads';
fs.mkdirSync(resolve(UPLOADS_DIR), { recursive: true });

/* eslint-disable sonarjs/content-length -- multer file size limit, not HTTP Content-Length */
export function createDocumentUploadInterceptor(maxFileSizeBytes: number) {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: maxFileSizeBytes },
    defParamCharset: 'utf8',
  });
}
/* eslint-enable sonarjs/content-length */

export async function cleanupTempUploadFile(
  filePath: string,
  logger: Pick<PinoLogger, 'warn'>,
): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    logger.warn(
      {
        filePath,
        error: error as Error,
      },
      'Failed to clean up temp file',
    );
  }
}

type DocumentUploadMimeTypeErrorReason = 'unsupported' | 'missing-mime';

export function resolveDocumentUploadMimeType(params: {
  file: UploadedDocument;
  errorMessage: (
    reason: DocumentUploadMimeTypeErrorReason,
    detectedType: string | null,
  ) => string;
}): string {
  const detectedType = detectFileType(
    params.file.mimetype,
    params.file.originalname,
  );
  if (!isDocumentSourceFile(detectedType)) {
    throw new BadRequestException(
      params.errorMessage('unsupported', detectedType),
    );
  }

  const canonicalMimeType = getCanonicalMimeType(detectedType);
  if (!canonicalMimeType) {
    throw new BadRequestException(
      params.errorMessage('missing-mime', detectedType),
    );
  }

  return canonicalMimeType;
}
