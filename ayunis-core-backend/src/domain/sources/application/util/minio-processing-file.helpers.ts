import type { Logger } from '@nestjs/common';
import * as path from 'path';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';

/**
 * Staging path for a processing input file. `batchId` is whatever owns the
 * file's lifecycle: the source id for documents, the upload id for
 * CSV/spreadsheet batches (their file is shared by every sheet source).
 */
export function buildMinioProcessingPath(
  orgId: string,
  batchId: string,
  fileName: string,
): string {
  const sanitizedFileName = path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${orgId}/processing/${batchId}/${sanitizedFileName}`;
}

/** Shared by the processing consumers, which stage their input files in MinIO. */
export async function downloadMinioFile(
  downloadObjectUseCase: DownloadObjectUseCase,
  minioPath: string,
): Promise<Buffer> {
  const stream = await downloadObjectUseCase.execute(
    new DownloadObjectCommand(minioPath),
  );
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Best-effort: a failed cleanup is logged, never thrown. */
export async function cleanupMinioProcessingFile(
  deleteObjectUseCase: DeleteObjectUseCase,
  logger: Logger,
  minioPath: string,
): Promise<void> {
  try {
    await deleteObjectUseCase.execute(new DeleteObjectCommand(minioPath));
  } catch (err) {
    logger.warn(
      {
        fileName: minioPath,
        err: err as Error,
      },
      'Failed to clean up MinIO processing file',
    );
  }
}
