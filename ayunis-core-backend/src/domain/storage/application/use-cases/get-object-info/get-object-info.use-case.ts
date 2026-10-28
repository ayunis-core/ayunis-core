import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { GetObjectInfoCommand } from './get-object-info.command';
import storageConfig from 'src/config/storage.config';
import {
  DownloadFailedError,
  ObjectNotFoundError,
} from 'src/domain/storage/application/storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';

@Injectable()
export class GetObjectInfoUseCase {
  private readonly logger = new Logger(GetObjectInfoUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: GetObjectInfoCommand): Promise<StorageObject> {
    this.logger.debug(
      {
        bucket: command.bucket,
        fileName: command.objectName,
      },
      'Getting object info',
    );

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      const info = await this.objectStorage.getObjectInfo(
        new StorageUrl(command.objectName, bucketName),
      );

      this.logger.debug(
        {
          bucket: bucketName,
          fileName: command.objectName,
          size: info.size,
          etag: info.etag,
        },
        'Successfully retrieved object info',
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
        { err: error as Error, fileName: command.objectName },
        'Failed to get object info',
      );
      throw new DownloadFailedError();
    }
  }

  private getDefaultBucket(): string {
    return this.config.minio.bucket;
  }
}
