import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentSourceFile,
} from 'src/common/util/file-type';
import {
  SOURCE_FILE_UPLOAD_OPTIONS,
  type UploadedSourceFile,
} from 'src/common/util/source-file-upload';

export type UploadedDocument = UploadedSourceFile;

export function createDocumentUploadInterceptor(maxFileSizeBytes: number) {
  return FileInterceptor('file', {
    ...SOURCE_FILE_UPLOAD_OPTIONS,
    limits: { fileSize: maxFileSizeBytes },
  });
}

interface UploadCleanupLogger {
  warn(obj: unknown, msg?: string, ...args: unknown[]): void;
}

export async function cleanupTempUploadFile(
  filePath: string,
  logger: UploadCleanupLogger,
): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    logger.warn(
      { filePath, error: error as Error },
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
