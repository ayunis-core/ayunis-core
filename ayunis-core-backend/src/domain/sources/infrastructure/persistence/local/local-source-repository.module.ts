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
import { SourceUploadSessionRecord } from './schema/source-upload-session.record';
import { SourceUploadSessionMapper } from './mappers/source-upload-session.mapper';
import { LocalSourceUploadSessionRepository } from './local-source-upload-session.repository';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
import { SourceTranscriptSegmentRecord } from './schema/source-transcript-segment.record';
import { LocalSourceTranscriptRepository } from './local-source-transcript.repository';

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
      SourceUploadSessionRecord,
      SourceTranscriptSegmentRecord,
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
    SourceUploadSessionMapper,
    LocalSourceUploadSessionRepository,
    {
      provide: SourceUploadSessionRepository,
      useExisting: LocalSourceUploadSessionRepository,
    },
    {
      provide: SourceTranscriptRepository,
      useClass: LocalSourceTranscriptRepository,
    },
  ],
  exports: [
    SourceRepository,
    SourceMapper,
    SourceUploadSessionRepository,
    SourceTranscriptRepository,
  ],
})
export class LocalSourceRepositoryModule {}
