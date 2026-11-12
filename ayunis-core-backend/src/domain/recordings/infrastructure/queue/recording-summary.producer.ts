import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  RecordingSummaryQueue,
  type RecordingSummaryJobData,
} from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import { STANDARD_JOB_OPTIONS } from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import {
  RECORDING_SUMMARY_QUEUE,
  SUMMARIZE_RECORDING_JOB,
} from './recording-summary.constants';

@Injectable()
export class RecordingSummaryProducer extends RecordingSummaryQueue {
  private readonly logger = new Logger(RecordingSummaryProducer.name);

  constructor(
    @InjectQueue(RECORDING_SUMMARY_QUEUE)
    private readonly queue: Queue<RecordingSummaryJobData>,
  ) {
    super();
  }

  async enqueue(job: RecordingSummaryJobData): Promise<void> {
    this.logger.log(
      { recordingId: job.recordingId, runId: job.runId },
      'Enqueuing recording summary',
    );
    // BullMQ ignores an add whose job id still exists.
    await this.queue.add(SUMMARIZE_RECORDING_JOB, job, {
      ...STANDARD_JOB_OPTIONS,
      jobId: job.runId,
    });
  }
}
