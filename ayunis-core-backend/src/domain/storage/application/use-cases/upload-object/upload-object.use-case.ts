import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(UploadObjectUseCase.name)
    private readonly logger: PinoLogger,
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: UploadObjectCommand): Promise<StorageObject> {
    this.logger.debug(
      {
        bucket: command.bucket,
        fileName: command.objectName,
      },
      'Uploading object',
    );

    try {
      const bucketName = this.resolveTargetBucket(command);

      const result = await this.objectStorage.upload(
        new StorageObjectUpload(
          command.objectName,
          command.data,
          command.options,
          bucketName,
        ),
      );

      this.logger.debug(
        {
          bucket: bucketName,
          fileName: command.objectName,
          size: result.size,
          etag: result.etag,
        },
        'Successfully uploaded object',
      );

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
        { err: error as Error, fileName: command.objectName },
        'Failed to upload object',
      );
      throw new UploadFailedError();
    }
  }

  private resolveTargetBucket(command: UploadObjectCommand): string {
    if (!this.isValidObjectName(command.objectName)) {
      throw new InvalidObjectNameError({ objectName: command.objectName });
    }

    const bucketName = command.bucket || this.getDefaultBucket();
    if (
      bucketName !== this.getDefaultBucket() &&
      !this.bucketExists(bucketName)
    ) {
      throw new BucketNotFoundError({ bucket: bucketName });
    }
    return bucketName;
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
      !/[\x00-\x1F]/.test(objectName) // eslint-disable-line no-control-regex
    );
  }

  private bucketExists(bucketName: string): boolean {
    try {
      // This is a dummy method - implementation depends on the provider
      // For example, MinIO would call client.bucketExists
      return true;
    } catch (error) {
      this.logger.error(
        { bucket: bucketName, err: error as Error },
        'Error checking if bucket exists',
      );
      return false;
    }
  }
}
