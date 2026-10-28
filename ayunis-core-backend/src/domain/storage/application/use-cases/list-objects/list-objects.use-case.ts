import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { ListObjectsCommand } from './list-objects.command';
import storageConfig from 'src/config/storage.config';

@Injectable()
export class ListObjectsUseCase {
  private readonly logger = new Logger(ListObjectsUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: ListObjectsCommand): Promise<string[]> {
    this.logger.debug({ prefix: command.prefix }, 'Listing objects');
    const bucket = command.bucket ?? this.config.minio.bucket;
    return this.objectStorage.listObjects(command.prefix, bucket);
  }
}
