import { Transactional } from '@nestjs-cls/transactional';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { UUID } from 'crypto';
import {
  DocumentProcessingPort,
  type DocumentProcessingJobData,
} from 'src/domain/sources/application/ports/document-processing.port';
import {
  DOCUMENT_PROCESSING_QUEUE,
  LARGE_DOCUMENT_PROCESSING_QUEUE,
} from './document-processing.constants';
import { ingestionLargeFileBytes } from 'src/config/ingestion.config';
import { isLongRunningJob } from 'src/domain/sources/application/util/processing-lane.helper';
import { DOCUMENT_JOB_OPTIONS, cancelQueueJob } from './bullmq-job.helpers';

@Injectable()
export class DocumentProcessingProducer extends DocumentProcessingPort {
  private readonly logger = new Logger(DocumentProcessingProducer.name);

  constructor(
    private readonly orgAccess: AssertOrgActiveUseCase,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly queue: Queue<DocumentProcessingJobData>,
    @InjectQueue(LARGE_DOCUMENT_PROCESSING_QUEUE)
    private readonly largeQueue: Queue<DocumentProcessingJobData>,
  ) {
    super();
  }

  @Transactional()
  async enqueue(data: DocumentProcessingJobData): Promise<void> {
    await this.orgAccess.execute({ orgId: data.orgId, lockForLifecycle: true });
    const queue = isLongRunningJob(data, ingestionLargeFileBytes())
      ? this.largeQueue
      : this.queue;
    this.logger.log(
      {
        sourceId: data.sourceId,
        fileName: data.fileName,
        queue: queue.name,
      },
      'Enqueuing document processing job',
    );

    await queue.add('process-document', data, {
      jobId: data.sourceId,
      ...DOCUMENT_JOB_OPTIONS,
    });
  }

  async cancelJob(sourceId: UUID): Promise<void> {
    await cancelQueueJob(this.queue, sourceId, this.logger);
    await cancelQueueJob(this.largeQueue, sourceId, this.logger);
  }
}
