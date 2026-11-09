import { Injectable, Logger } from '@nestjs/common';
import { ObjectChangedError } from 'src/domain/storage/application/storage.errors';
import { StoredFileMismatchError } from 'src/domain/sources/application/sources.errors';
import {
  downloadMinioFile,
  downloadMinioFileToPath,
  type DownloadedFile,
} from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.use-case';
import { GetObjectInfoCommand } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.command';

/**
 * Reads a source's stored file for processing. A directly uploaded original
 * was verified at completion, but its signed URLs stay valid for a
 * few more minutes, so the consumer re-checks the size before reading and
 * caps the read at it. The download checks the saved ETag against its own
 * response before exposing any bytes, rejecting same-size replacements too.
 */
@Injectable()
export class StoredSourceFileService {
  private readonly logger = new Logger(StoredSourceFileService.name);

  constructor(
    private readonly getObjectInfo: GetObjectInfoUseCase,
    private readonly downloadObject: DownloadObjectUseCase,
    private readonly deleteObject: DeleteObjectUseCase,
  ) {}

  /**
   * A retained original is only ever read against the size and ETag verified
   * at completion; without both, nothing bounds what a still-valid signed PUT
   * may have written since, so the job fails instead of buffering it.
   */
  async readRetained(
    storageKey: string,
    expectedSize?: number,
    expectedETag?: string,
  ): Promise<Buffer> {
    if (expectedSize === undefined || expectedETag === undefined) {
      this.logger.error(
        { fileName: storageKey },
        'Retained original queued without its verified size and ETag',
      );
      throw new StoredFileMismatchError(storageKey, { reason: 'unverified' });
    }
    return this.read(storageKey, expectedSize, expectedETag);
  }

  /** `readRetained`, streamed to `destination` instead of into memory. */
  async readRetainedToFile(
    storageKey: string,
    destination: string,
    expectedSize?: number,
    expectedETag?: string,
  ): Promise<DownloadedFile> {
    if (expectedSize === undefined || expectedETag === undefined) {
      this.logger.error(
        { fileName: storageKey },
        'Retained original queued without its verified size and ETag',
      );
      throw new StoredFileMismatchError(storageKey, { reason: 'unverified' });
    }
    return this.readToFile(storageKey, destination, expectedSize, expectedETag);
  }

  async read(
    storageKey: string,
    expectedSize?: number,
    expectedETag?: string,
  ): Promise<Buffer> {
    return this.guarded(storageKey, expectedSize, () =>
      downloadMinioFile(
        this.downloadObject,
        storageKey,
        expectedSize,
        expectedETag,
      ),
    );
  }

  async readToFile(
    storageKey: string,
    destination: string,
    expectedSize?: number,
    expectedETag?: string,
  ): Promise<DownloadedFile> {
    return this.guarded(storageKey, expectedSize, () =>
      downloadMinioFileToPath(
        this.downloadObject,
        storageKey,
        destination,
        expectedSize,
        expectedETag,
      ),
    );
  }

  private async guarded<T>(
    storageKey: string,
    expectedSize: number | undefined,
    download: () => Promise<T>,
  ): Promise<T> {
    if (expectedSize !== undefined) {
      await this.assertStoredSize(storageKey, expectedSize);
    }
    try {
      return await download();
    } catch (error) {
      if (error instanceof ObjectChangedError) {
        await this.removeMismatchedFile(storageKey);
        throw new StoredFileMismatchError(storageKey, {
          reason: 'etag-mismatch',
        });
      }
      // The body outgrew the verified size mid-stream: same treatment as the
      // stat and ETag mismatches, the object is not the verified upload.
      if (
        error instanceof StoredFileMismatchError &&
        expectedSize !== undefined
      )
        await this.removeMismatchedFile(storageKey);
      throw error;
    }
  }

  private async assertStoredSize(
    storageKey: string,
    expectedSize: number,
  ): Promise<void> {
    const { size } = await this.getObjectInfo.execute(
      new GetObjectInfoCommand(storageKey),
    );
    if (size === expectedSize) return;
    this.logger.warn(
      { fileName: storageKey, expectedSize, storedSize: size },
      'Stored file differs from the verified upload; removing it',
    );
    await this.removeMismatchedFile(storageKey);
    throw new StoredFileMismatchError(storageKey, {
      expectedSize,
      storedSize: size,
    });
  }

  private async removeMismatchedFile(storageKey: string): Promise<void> {
    try {
      await this.deleteObject.execute(new DeleteObjectCommand(storageKey));
    } catch (error) {
      this.logger.warn(
        { fileName: storageKey, err: error as Error },
        'Failed to remove the mismatched file',
      );
    }
  }
}
