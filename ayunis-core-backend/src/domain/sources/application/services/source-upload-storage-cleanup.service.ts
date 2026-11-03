import { Injectable, Logger } from '@nestjs/common';
import type { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { AbortMultipartUploadUseCase } from 'src/domain/storage/application/use-cases/abort-multipart-upload/abort-multipart-upload.use-case';
import { AbortMultipartUploadCommand } from 'src/domain/storage/application/use-cases/abort-multipart-upload/abort-multipart-upload.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';

/**
 * Best-effort removal of what an unfinished upload left in storage: the
 * multipart upload's parts and any object already assembled. Failures are
 * logged and returned as false so retention cleanup preserves the session
 * for another attempt instead of forgetting storage that could not be removed.
 */
@Injectable()
export class SourceUploadStorageCleanupService {
  private readonly logger = new Logger(SourceUploadStorageCleanupService.name);

  constructor(
    private readonly abortMultipartUpload: AbortMultipartUploadUseCase,
    private readonly deleteObject: DeleteObjectUseCase,
  ) {}

  async discard(session: SourceUploadSession): Promise<boolean> {
    const aborted =
      session.multipartUploadId === null ||
      (await this.abort(session.storageKey, session.multipartUploadId));
    const removed = await this.remove(session.storageKey);
    return aborted && removed;
  }

  async abort(storageKey: string, uploadId: string): Promise<boolean> {
    try {
      await this.abortMultipartUpload.execute(
        new AbortMultipartUploadCommand(storageKey, uploadId),
      );
      return true;
    } catch (error) {
      this.logger.warn(
        { fileName: storageKey, err: error as Error },
        'Failed to abort multipart upload',
      );
      return false;
    }
  }

  async remove(storageKey: string): Promise<boolean> {
    try {
      await this.deleteObject.execute(new DeleteObjectCommand(storageKey));
      return true;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return true;
      this.logger.warn(
        { fileName: storageKey, err: error as Error },
        'Failed to remove uploaded object',
      );
      return false;
    }
  }
}
