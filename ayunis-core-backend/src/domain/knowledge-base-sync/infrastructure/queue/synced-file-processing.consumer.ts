import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { ingestionConcurrency } from 'src/config/ingestion.config';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { CompleteSyncedFileProcessingCommand } from 'src/domain/knowledge-base-sync/application/use-cases/complete-synced-file-processing/complete-synced-file-processing.command';
import { CompleteSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/complete-synced-file-processing/complete-synced-file-processing.use-case';
import { FailSyncedFileProcessingCommand } from 'src/domain/knowledge-base-sync/application/use-cases/fail-synced-file-processing/fail-synced-file-processing.command';
import { FailSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/fail-synced-file-processing/fail-synced-file-processing.use-case';
import { StartSyncedFileProcessingCommand } from 'src/domain/knowledge-base-sync/application/use-cases/start-synced-file-processing/start-synced-file-processing.command';
import {
  StartSyncedFileProcessingOutcome,
  type StartSyncedFileProcessingResult,
} from 'src/domain/knowledge-base-sync/application/use-cases/start-synced-file-processing/start-synced-file-processing.result';
import { StartSyncedFileProcessingUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/start-synced-file-processing/start-synced-file-processing.use-case';
import type { DocumentToProcess } from 'src/domain/sources/application/models/document-to-process';
import { SourceReindexScheduler } from 'src/domain/sources/application/services/source-reindex-scheduler.service';
import {
  classifyJobFailure,
  documentRetryDelayMs,
} from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import { DocumentProcessingPipeline } from 'src/domain/sources/infrastructure/queue/document-processing.pipeline';
import { observeJob } from 'src/domain/sources/infrastructure/queue/job-telemetry';
import { AdmitOrgProcessingQuery } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.query';
import { AdmitOrgProcessingUseCase } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.use-case';
import { KNOWLEDGE_BASE_SYNC_QUEUE } from './knowledge-base-sync.constants';

/**
 * Processes synced files on their own queue, with the document pipeline of
 * uploads, so uploads never wait behind a sync. A job reads its version of
 * the file into a hidden replacement of the file's document, runs the
 * pipeline on it and then settles the version. A throttling source system
 * delays the job until the time it names.
 */
@Processor(KNOWLEDGE_BASE_SYNC_QUEUE, {
  concurrency: ingestionConcurrency('sync'),
  settings: {
    backoffStrategy: (attemptsMade, _type, error) =>
      documentRetryDelayMs(attemptsMade, error),
  },
})
export class SyncedFileProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(SyncedFileProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly admitOrgProcessing: AdmitOrgProcessingUseCase,
    private readonly startProcessing: StartSyncedFileProcessingUseCase,
    private readonly completeProcessing: CompleteSyncedFileProcessingUseCase,
    private readonly failProcessing: FailSyncedFileProcessingUseCase,
    private readonly pipeline: DocumentProcessingPipeline,
    private readonly reindexScheduler: SourceReindexScheduler,
  ) {
    super();
  }

  async process(job: Job<SyncedFileJobData>, token?: string): Promise<void> {
    this.logger.log(
      { jobId: job.id, syncedFileId: job.data.syncedFileId },
      'Processing synced file',
    );
    const retryAt = await observeJob(job, () =>
      this.contextService.run(() => this.processFile(job)),
    );
    // Delayed without spending an attempt, outside the telemetry, which
    // would count it as a failure.
    if (retryAt) {
      await job.moveToDelayed(retryAt.getTime(), token);
      throw new DelayedError();
    }
  }

  /** When the source system throttles, the time it may be asked again. */
  private async processFile(job: Job<SyncedFileJobData>): Promise<Date | null> {
    // Synced files are processed without a user.
    this.contextService.set('orgId', job.data.orgId);
    if (
      !(await this.admitOrgProcessing.execute(
        new AdmitOrgProcessingQuery(job.data.orgId),
      ))
    ) {
      this.logger.warn({ jobId: job.id }, 'Organisation deleted');
      return null;
    }
    const started = await this.start(job);
    if (started?.outcome === StartSyncedFileProcessingOutcome.THROTTLED)
      return started.retryAt;
    if (started?.outcome === StartSyncedFileProcessingOutcome.PROCESS)
      await this.runPipeline(job, started.document);
    return null;
  }

  /** `null` when reading the file failed; a retry or the failure follows. */
  private async start(
    job: Job<SyncedFileJobData>,
  ): Promise<StartSyncedFileProcessingResult | null> {
    try {
      return await this.startProcessing.execute(
        new StartSyncedFileProcessingCommand(job.data),
      );
    } catch (error) {
      this.logger.error(
        { jobId: job.id, err: error as Error },
        'Reading the synced file failed',
      );
      const { final, rethrow } = classifyJobFailure(job, error);
      if (final)
        await this.failProcessing.execute(
          new FailSyncedFileProcessingCommand(job.data, error),
        );
      if (rethrow) throw rethrow;
      return null;
    }
  }

  // The version is settled also when the pipeline rethrows its final
  // failure; a replacement still PROCESSING waits for the retry.
  private async runPipeline(
    job: Job<SyncedFileJobData>,
    document: DocumentToProcess,
  ): Promise<void> {
    try {
      await this.pipeline.process(job, document);
    } finally {
      const indexed = await this.completeProcessing.execute(
        new CompleteSyncedFileProcessingCommand(job.data, document.sourceId),
      );
      if (indexed)
        await this.reindexScheduler.reindexIfModelChanged(
          document.sourceId,
          job.data.orgId,
        );
    }
  }
}
