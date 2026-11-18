import { Module } from '@nestjs/common';
import { RecordingsTranscriptReadyListener } from './application/listeners/transcript-ready.listener';
import { RecordingSummaryScheduler } from './application/services/recording-summary-scheduler.service';
import { StartRecordingSummaryUseCase } from './application/use-cases/start-recording-summary/start-recording-summary.use-case';
import { LocalRecordingRepositoryModule } from './infrastructure/persistence/local/local-recording-repository.module';
import { RecordingSummaryQueueModule } from './infrastructure/queue/recording-summary-queue.module';

/**
 * Queues a recording's summary once its transcript is ready. Imported where
 * document processing runs (IngestionConsumersModule: the API, or the
 * separate ingestion worker), because the transcript-ready event is emitted
 * in that process.
 */
@Module({
  imports: [LocalRecordingRepositoryModule, RecordingSummaryQueueModule],
  providers: [
    RecordingSummaryScheduler,
    StartRecordingSummaryUseCase,
    RecordingsTranscriptReadyListener,
  ],
})
export class RecordingSummaryTriggerModule {}
