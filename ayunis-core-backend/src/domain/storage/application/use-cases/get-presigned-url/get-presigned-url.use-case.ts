import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { GetPresignedUrlCommand } from './get-presigned-url.command';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from '../../../domain/storage-url.entity';
import { PresignedUrl } from '../../../domain/presigned-url.entity';

@Injectable()
export class GetPresignedUrlUseCase {
  private readonly logger = new Logger(GetPresignedUrlUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: GetPresignedUrlCommand): Promise<PresignedUrl> {
    this.logger.debug(
      `Generating presigned URL for object: ${command.objectName}`,
      {
        bucket: command.bucket,
        expiresIn: command.expiresIn,
      },
    );

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      // Check if object exists before generating URL
      const exists = await this.objectExists(command.objectName, bucketName);
      if (!exists) {
        throw new ObjectNotFoundError({
          objectName: command.objectName,
          bucket: bucketName,
        });
      }

      const url = await this.objectStorage.getPresignedUrl(
        new StorageUrl(command.objectName, bucketName),
        command.expiresIn,
      );

      this.logger.debug(
        `Successfully generated presigned URL for object: ${command.objectName}`,
      );
      return url;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }

      this.logger.error(
        `Failed to generate presigned URL for object: ${command.objectName}`,
        error,
      );
      throw new DownloadFailedError({
        objectName: command.objectName,
        message: error.message,
        metadata: { originalError: error },
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
