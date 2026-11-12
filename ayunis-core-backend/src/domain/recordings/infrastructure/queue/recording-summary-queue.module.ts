import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RecordingSummaryQueue } from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import { RECORDING_SUMMARY_QUEUE } from './recording-summary.constants';
import { RecordingSummaryProducer } from './recording-summary.producer';

// Enqueue side only. The consumer lives in RecordingsModule, so the ingestion
// worker can queue summaries without generating them.
@Module({
  imports: [BullModule.registerQueue({ name: RECORDING_SUMMARY_QUEUE })],
  providers: [
    RecordingSummaryProducer,
    { provide: RecordingSummaryQueue, useExisting: RecordingSummaryProducer },
  ],
  exports: [RecordingSummaryQueue, BullModule],
})
export class RecordingSummaryQueueModule {}
