import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { UUID } from 'crypto';
import {
  DocumentProcessingPort,
  type DocumentProcessingJobData,
} from '../../application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { STANDARD_JOB_OPTIONS, cancelQueueJob } from './bullmq-job.helpers';

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
      ...STANDARD_JOB_OPTIONS,
    });
  }

  async cancelJob(sourceId: UUID): Promise<void> {
    await cancelQueueJob(this.queue, sourceId, this.logger);
  }
}
