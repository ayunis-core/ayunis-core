import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { GetPresignedUrlCommand } from './get-presigned-url.command';
import storageConfig from 'src/config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { PresignedUrl } from 'src/domain/storage/domain/presigned-url.entity';

@Injectable()
export class GetPresignedUrlUseCase {
  constructor(
    @InjectPinoLogger(GetPresignedUrlUseCase.name)
    private readonly logger: PinoLogger,
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: GetPresignedUrlCommand): Promise<PresignedUrl> {
    this.logger.debug(
      {
        bucket: command.bucket,
        expiresIn: command.expiresIn,
        fileName: command.objectName,
      },
      'Generating presigned URL for object',
    );

    try {
      const bucketName = command.bucket ?? this.getDefaultBucket();

      // Check if object exists before generating URL
      const exists = await this.objectExists(command.objectName, bucketName);
      if (!exists) {
        throw new ObjectNotFoundError({
          objectName: command.objectName,
          bucket: bucketName,
        });
      }

      const responseOverrides =
        command.responseContentType || command.responseContentDisposition
          ? {
              contentType: command.responseContentType,
              contentDisposition: command.responseContentDisposition,
            }
          : undefined;

      const url = await this.objectStorage.getPresignedUrl(
        new StorageUrl(command.objectName, bucketName),
        command.expiresIn,
        responseOverrides,
      );

      this.logger.debug(
        { fileName: command.objectName },
        'Successfully generated presigned URL for object',
      );
      return url;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }

      this.logger.error(
        { err: error as Error, fileName: command.objectName },
        'Failed to generate presigned URL for object',
      );
      throw new DownloadFailedError();
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
    const bucketName = bucket ?? this.getDefaultBucket();
    return this.objectStorage.exists(new StorageUrl(objectName, bucketName));
  }
}
