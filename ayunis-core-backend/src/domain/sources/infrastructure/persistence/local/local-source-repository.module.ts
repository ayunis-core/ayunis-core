import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceRecord } from './schema/source.record';
import { SourceContentRecord } from './schema/source-content.record';
import { FileSourceRecord } from './schema/file-source.record';
import { UrlSourceRecord } from './schema/url-source.record';
import { LocalSourceRepository } from './local-source.repository';
import { SourceMapper } from './mappers/source.mapper';
import { SourceContentMapper } from './mappers/source-content.mapper';
import { SOURCE_REPOSITORY } from '../../../application/ports/source.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SourceRecord,
      SourceContentRecord,
      FileSourceRecord,
      UrlSourceRecord,
    ]),
  ],
  providers: [
    SourceMapper,
    SourceContentMapper,
    LocalSourceRepository,
    {
      provide: SOURCE_REPOSITORY,
      useExisting: LocalSourceRepository,
    },
  ],
  exports: [SOURCE_REPOSITORY, SourceMapper],
})
export class LocalSourceRepositoryModule {}
