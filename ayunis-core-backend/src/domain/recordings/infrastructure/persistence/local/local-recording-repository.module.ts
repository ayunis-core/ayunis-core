import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { LocalRecordingRepository } from './local-recording.repository';
import { RecordingMapper } from './mappers/recording.mapper';
import { RecordingRecord } from './schema/recording.record';

@Module({
  imports: [TypeOrmModule.forFeature([RecordingRecord])],
  providers: [
    RecordingMapper,
    { provide: RecordingRepository, useClass: LocalRecordingRepository },
  ],
  exports: [RecordingRepository],
})
export class LocalRecordingRepositoryModule {}
