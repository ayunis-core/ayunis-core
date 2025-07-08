import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { DownloadObjectCommand } from './download-object.command';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from '../../../domain/storage-url.entity';

@Injectable()
export class DownloadObjectUseCase {
  private readonly logger = new Logger(DownloadObjectUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    command: DownloadObjectCommand,
  ): Promise<NodeJS.ReadableStream> {
    this.logger.debug(`Downloading object: ${command.objectName}`, {
      bucket: command.bucket,
    });

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      // Check if object exists before downloading
      const exists = await this.objectExists(command.objectName, bucketName);
      if (!exists) {
        throw new ObjectNotFoundError({
          objectName: command.objectName,
          bucket: bucketName,
        });
      }

      const stream = await this.objectStorage.download(
        new StorageUrl(command.objectName, bucketName),
      );
      this.logger.debug(
        `Successfully started download for object: ${command.objectName}`,
      );

      return stream;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }

      this.logger.error(
        `Failed to download object: ${command.objectName}`,
        error,
      );
      throw new DownloadFailedError({
        objectName: command.objectName,
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: { originalError: error as Error },
      });
    }
  }

  private getDefaultBucket(): string {
    return this.config.minio.bucket;
  }

  private async objectExists(
    objectName: string,
    bucket?: string,
  ): Promise<boolean> {
    try {
      const bucketName = bucket || this.getDefaultBucket();
      return this.objectStorage.exists(new StorageUrl(objectName, bucketName));
    } catch (error) {
      this.logger.error(
        `Error checking if object exists: ${objectName}`,
        error,
      );
      return false;
    }
  }
}
