import type { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { StoredFileMismatchError } from 'src/domain/sources/application/sources.errors';

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

/**
 * Shared by the processing consumers, which read their input files from
 * MinIO. With `maxBytes`, reading stops as soon as the object exceeds it, so a
 * file replaced after verification can never be buffered whole.
 */
export async function downloadMinioFile(
  downloadObjectUseCase: DownloadObjectUseCase,
  minioPath: string,
  maxBytes?: number,
  expectedETag?: string,
): Promise<Buffer> {
  const stream = await downloadObjectUseCase.execute(
    new DownloadObjectCommand(minioPath, undefined, expectedETag),
  );
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (maxBytes !== undefined && total > maxBytes) {
      throw new StoredFileMismatchError(minioPath, { maxBytes });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export interface DownloadedFile {
  size: number;
  sha256: string;
}

/**
 * Same bounds as `downloadMinioFile`, but the bytes go straight to
 * `destination` and are hashed on the way, so a large recording never sits in
 * the process; the caller owns the file.
 */
export async function downloadMinioFileToPath(
  downloadObjectUseCase: DownloadObjectUseCase,
  minioPath: string,
  destination: string,
  maxBytes?: number,
  expectedETag?: string,
): Promise<DownloadedFile> {
  const stream = await downloadObjectUseCase.execute(
    new DownloadObjectCommand(minioPath, undefined, expectedETag),
  );
  const hash = createHash('sha256');
  let total = 0;
  const bounded = async function* () {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (maxBytes !== undefined && total > maxBytes) {
        throw new StoredFileMismatchError(minioPath, { maxBytes });
      }
      hash.update(buffer);
      yield buffer;
    }
  };
  await pipeline(
    Readable.from(bounded()),
    createWriteStream(destination, { mode: 0o600 }),
  );
  return { size: total, sha256: hash.digest('hex') };
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
