import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { LocalRecordingRepository } from './local-recording.repository';
import { LocalRecordingSummaryRepository } from './local-recording-summary.repository';
import { RecordingMapper } from './mappers/recording.mapper';
import { RecordingSummaryMapper } from './mappers/recording-summary.mapper';
import { RecordingRecord } from './schema/recording.record';
import { RecordingSummaryRecord } from './schema/recording-summary.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordingRecord,
      RecordingSummaryRecord,
      SourceRecord,
    ]),
  ],
  providers: [
    RecordingMapper,
    RecordingSummaryMapper,
    { provide: RecordingRepository, useClass: LocalRecordingRepository },
    {
      provide: RecordingSummaryRepository,
      useClass: LocalRecordingSummaryRepository,
    },
  ],
  exports: [RecordingRepository, RecordingSummaryRepository],
})
export class LocalRecordingRepositoryModule {}
