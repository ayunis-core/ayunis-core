import { ingestionConcurrency } from 'src/config/ingestion.config';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { AdmitOrgProcessingUseCase } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.use-case';
import { AdmitOrgProcessingQuery } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.query';
import { setJobContext } from './job-context';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { documentRetryDelayMs } from './bullmq-job.helpers';
import { observeJob } from './job-telemetry';
import { DocumentProcessingPipeline } from './document-processing.pipeline';

@Processor(DOCUMENT_PROCESSING_QUEUE, {
  concurrency: ingestionConcurrency('document'),
  settings: {
    backoffStrategy: (attemptsMade, _type, error) =>
      documentRetryDelayMs(attemptsMade, error),
  },
})
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly admitOrgProcessing: AdmitOrgProcessingUseCase,
    private readonly pipeline: DocumentProcessingPipeline,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, fileName } = job.data;
    this.logger.log(
      {
        sourceId,
        fileName,
        jobId: job.id,
      },
      'Processing document',
    );
    return observeJob(job, () => this.processDocument(job));
  }

  private async processDocument(
    job: Job<DocumentProcessingJobData>,
  ): Promise<void> {
    const { orgId, userId } = job.data;

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      setJobContext(this.contextService, orgId, userId);
      if (!(await this.isAdmitted(job))) return;
      await this.pipeline.process(job, job.data);
    });
  }

  private async isAdmitted(
    job: Job<DocumentProcessingJobData>,
  ): Promise<boolean> {
    const admitted = await this.admitOrgProcessing.execute(
      new AdmitOrgProcessingQuery(job.data.orgId),
    );
    if (!admitted) {
      this.logger.warn(
        { jobId: job.id, orgId: job.data.orgId },
        'Organisation deleted',
      );
    }
    return admitted;
  }
}
