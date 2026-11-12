import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { RecordingSummaryQueue } from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';

/**
 * Queues the job of a run that was just started. A run whose job could not be
 * queued is failed, so it does not stay pending and can be tried again.
 */
@Injectable()
export class RecordingSummaryScheduler {
  constructor(
    private readonly queue: RecordingSummaryQueue,
    private readonly summaries: RecordingSummaryRepository,
  ) {}

  async schedule(
    summary: RecordingSummary,
    orgId: UUID,
    billedUserId: UUID,
  ): Promise<void> {
    try {
      await this.queue.enqueue({
        recordingId: summary.recordingId,
        runId: summary.runId,
        orgId,
        userId: billedUserId,
      });
    } catch (error) {
      await this.summaries.markFailed(
        summary.recordingId,
        summary.runId,
        RecordingSummaryFailure.SUMMARY_FAILED,
      );
      throw error;
    }
  }
}
