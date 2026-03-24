import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { UUID } from 'crypto';
import {
  DocumentProcessingPort,
  type DocumentProcessingJobData,
} from '../../application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';

@Injectable()
export class DocumentProcessingProducer extends DocumentProcessingPort {
  private readonly logger = new Logger(DocumentProcessingProducer.name);

  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly queue: Queue<DocumentProcessingJobData>,
  ) {
    super();
  }

  async enqueue(data: DocumentProcessingJobData): Promise<void> {
    this.logger.log('Enqueuing document processing job', {
      sourceId: data.sourceId,
      fileName: data.fileName,
    });

    await this.queue.add('process-document', data, {
      jobId: data.sourceId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  async cancelJob(sourceId: UUID): Promise<void> {
    try {
      const job = await this.queue.getJob(sourceId);
      if (!job) {
        this.logger.debug('No job found to cancel', { sourceId });
        return;
      }

      const state = await job.getState();
      if (state === 'active') {
        // Active jobs can't be removed — let the consumer's guard handle it.
        this.logger.debug('Job is active, skipping removal', { sourceId });
        return;
      }

      await job.remove();
      this.logger.log('Cancelled queued job', { sourceId, state });
    } catch (err) {
      this.logger.warn('Best-effort job cancellation failed', {
        sourceId,
        error: err as Error,
      });
    }
  }
}
