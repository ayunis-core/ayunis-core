import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { StorageObject } from '../../../domain/storage-object.entity';
import { UploadObjectCommand } from './upload-object.command';
import storageConfig from '../../../../../config/storage.config';
import {
  BucketNotFoundError,
  InvalidObjectNameError,
  StoragePermissionDeniedError,
  UploadFailedError,
} from '../../storage.errors';
import { StorageObjectUpload } from '../../../domain/storage-object-upload.entity';

@Injectable()
export class UploadObjectUseCase {
  private readonly logger = new Logger(UploadObjectUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: UploadObjectCommand): Promise<StorageObject> {
    this.logger.debug(`Uploading object: ${command.objectName}`, {
      bucket: command.bucket,
    });

    try {
      if (!this.isValidObjectName(command.objectName)) {
        throw new InvalidObjectNameError({ objectName: command.objectName });
      }

      const bucketName = command.bucket || this.getDefaultBucket();

      // Check if bucket exists before uploading
      if (bucketName !== this.getDefaultBucket()) {
        const bucketExists = await this.bucketExists(bucketName);
        if (!bucketExists) {
          throw new BucketNotFoundError({ bucket: bucketName });
        }
      }

      const result = await this.objectStorage.upload(
        new StorageObjectUpload(
          command.objectName,
          command.data,
          command.options,
          bucketName,
        ),
      );

      this.logger.debug(`Successfully uploaded object: ${command.objectName}`, {
        bucket: bucketName,
        size: result.size,
        etag: result.etag,
      });

      return new StorageObject(
        command.objectName,
        bucketName,
        result.size,
        result.etag,
        result.metadata.toRawMetadata(),
        result.lastModified,
      );
    } catch (error) {
      if (
        error instanceof StoragePermissionDeniedError ||
        error instanceof BucketNotFoundError ||
        error instanceof InvalidObjectNameError
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to upload object: ${command.objectName}`,
        error,
      );
      throw new UploadFailedError({
        objectName: command.objectName,
        message: error.message,
        metadata: { originalError: error },
      });
    }
  }

  private getDefaultBucket(): string {
    return this.config.minio.bucket;
  }

  private isValidObjectName(objectName: string): boolean {
    // Basic validation: non-empty, no control characters, reasonable length
    return (
      !!objectName &&
      objectName.length > 0 &&
      objectName.length <= 1024 &&
      !/[\x00-\x1F]/.test(objectName)
    );
  }

  private async bucketExists(bucketName: string): Promise<boolean> {
    try {
      // This is a dummy method - implementation depends on the provider
      // For example, MinIO would call client.bucketExists
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking if bucket exists: ${bucketName}`,
        error,
      );
      return false;
    }
  }
}
