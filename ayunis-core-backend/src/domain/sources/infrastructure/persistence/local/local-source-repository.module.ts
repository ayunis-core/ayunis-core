import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SourceRecord,
  TextSourceRecord,
  DataSourceRecord,
} from './schema/source.record';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import { LocalSourceRepository } from './local-source.repository';
import { SourceMapper } from './mappers/source.mapper';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  FileSourceDetailsRecord,
  TextSourceDetailsRecord,
  UrlSourceDetailsRecord,
} from './schema/text-source-details.record';
import { DataSourceDetailsRecord } from './schema/data-source-details.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SourceRecord,
      TextSourceRecord,
      TextSourceDetailsRecord,
      DataSourceRecord,
      DataSourceDetailsRecord,
      FileSourceDetailsRecord,
      UrlSourceDetailsRecord,
      SourceContentChunkRecord,
    ]),
  ],
  providers: [
    SourceMapper,
    SourceContentChunkMapper,
    LocalSourceRepository,
    {
      provide: SourceRepository,
      useExisting: LocalSourceRepository,
    },
  ],
  exports: [SourceRepository, SourceMapper],
})
export class LocalSourceRepositoryModule {}
