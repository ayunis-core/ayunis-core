import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  ObjectStoragePort,
  type StorageObjectSummary,
} from 'src/domain/storage/application/ports/object-storage.port';
import storageConfig from 'src/config/storage.config';
import { ListObjectSummariesCommand } from './list-object-summaries.command';

/** Like ListObjectsUseCase, but with each object's last-modified time. */
@Injectable()
export class ListObjectSummariesUseCase {
  private readonly logger = new Logger(ListObjectSummariesUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    command: ListObjectSummariesCommand,
  ): Promise<StorageObjectSummary[]> {
    this.logger.debug({ prefix: command.prefix }, 'Listing object summaries');
    const bucket = command.bucket ?? this.config.minio.bucket;
    return this.objectStorage.listObjectsWithMetadata(command.prefix, bucket);
  }
}
