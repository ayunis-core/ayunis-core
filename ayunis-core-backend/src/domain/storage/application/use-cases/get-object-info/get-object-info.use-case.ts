import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { StorageObject } from '../../../domain/storage-object.entity';
import { GetObjectInfoCommand } from './get-object-info.command';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from '../../../domain/storage-url.entity';

@Injectable()
export class GetObjectInfoUseCase {
  private readonly logger = new Logger(GetObjectInfoUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: GetObjectInfoCommand): Promise<StorageObject> {
    this.logger.debug(`Getting info for object: ${command.objectName}`, {
      bucket: command.bucket,
    });

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      const info = await this.objectStorage.getObjectInfo(
        new StorageUrl(command.objectName, bucketName),
      );

      this.logger.debug(
        `Successfully retrieved info for object: ${command.objectName}`,
        {
          bucket: bucketName,
          size: info.size,
          etag: info.etag,
        },
      );

      return new StorageObject(
        command.objectName,
        bucketName,
        info.size,
        info.etag,
        info.metadata.toRawMetadata(),
        info.lastModified,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ObjectNotFoundError({
          objectName: command.objectName,
          bucket: command.bucket,
        });
      }

      this.logger.error(
        `Failed to get object info: ${command.objectName}`,
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
}
