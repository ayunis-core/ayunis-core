import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { DeleteObjectCommand } from './delete-object.command';
import storageConfig from 'src/config/storage.config';
import { DeleteFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';

@Injectable()
export class DeleteObjectUseCase {
  private readonly logger = new Logger(DeleteObjectUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: DeleteObjectCommand): Promise<void> {
    this.logger.debug(`Deleting object: ${command.objectName}`, {
      bucket: command.bucket,
    });

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      // Check if object exists before deleting
      const exists = await this.objectExists(command.objectName, bucketName);
      if (!exists) {
        throw new ObjectNotFoundError({
          objectName: command.objectName,
          bucket: bucketName,
        });
      }

      await this.objectStorage.delete(
        new StorageUrl(command.objectName, bucketName),
      );
      this.logger.debug(`Successfully deleted object: ${command.objectName}`);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }

      this.logger.error(
        `Failed to delete object: ${command.objectName}`,
        error,
      );
      throw new DeleteFailedError();
    }
  }

  private getDefaultBucket(): string {
    return this.config.minio.bucket;
  }

  private async objectExists(
    objectName: string,
    bucket?: string,
  ): Promise<boolean> {
    // Rejections propagate to execute()'s handler on purpose: a stat that
    // fails because storage is unreachable is a 500, not a 404 telling the
    // caller their object is gone.
    const bucketName = bucket || this.getDefaultBucket();
    return this.objectStorage.exists(new StorageUrl(objectName, bucketName));
  }
}
