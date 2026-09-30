import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { FileSourceExtractor } from 'src/domain/sources/application/services/file-source-extractor.service';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { classifyJobFailure } from './bullmq-job.helpers';

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 2 })
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly ingestion: SourceIngestionService,
    private readonly fileSourceExtractor: FileSourceExtractor,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, orgId, userId, minioPath, fileName, fileType } = job.data;
    this.logger.log(
      { sourceId, fileName, jobId: job.id },
      'Processing document',
    );

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);
      await this.ingestion.ingest({
        sourceId,
        orgId,
        kind: SourceIngestionKind.INITIAL,
        extractor: this.fileSourceExtractor,
        input: { minioPath, fileName, fileType },
        classifyFailure: (error) => classifyJobFailure(job, error),
      });
    });
  }

  private validateAndSetContext(
    orgId: UUID | undefined,
    userId: UUID | undefined,
  ): void {
    if (!orgId) throw new Error('orgId is required');
    if (!userId) throw new Error('userId is required');
    this.contextService.set('orgId', orgId);
    this.contextService.set('userId', userId);
  }
}
