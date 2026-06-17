import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { ListObjectsCommand } from './list-objects.command';
import storageConfig from '../../../../../config/storage.config';

@Injectable()
export class ListObjectsUseCase {
  private readonly logger = new Logger(ListObjectsUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(command: ListObjectsCommand): Promise<string[]> {
    this.logger.debug(`Listing objects with prefix: ${command.prefix}`);
    const bucket = command.bucket ?? this.config.minio.bucket;
    return this.objectStorage.listObjects(command.prefix, bucket);
  }
}
