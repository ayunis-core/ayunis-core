import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ingestionConcurrency } from 'src/config/ingestion.config';
import { ContextService } from 'src/common/context/services/context.service';
import { AdmitOrgProcessingQuery } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.query';
import { AdmitOrgProcessingUseCase } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.use-case';
import type { SourceReindexJobData } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import { classifySourceProcessingError } from 'src/domain/sources/application/services/classify-source-processing-error';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { SourceReindexer } from 'src/domain/sources/application/services/source-reindexer.service';
import { SourceReindexScheduler } from 'src/domain/sources/application/services/source-reindex-scheduler.service';
import { SOURCE_REINDEX_QUEUE } from './source-reindex.constants';
import { classifyJobFailure } from './bullmq-job.helpers';
import { observeJob, processingStage } from './job-telemetry';

const MAX_PASSES = 3;

@Processor(SOURCE_REINDEX_QUEUE, {
  concurrency: ingestionConcurrency('reindex'),
})
export class SourceReindexConsumer extends WorkerHost {
  private readonly logger = new Logger(SourceReindexConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly admitOrgProcessing: AdmitOrgProcessingUseCase,
    private readonly reindexer: SourceReindexer,
    private readonly reindexRepository: SourceReindexRepository,
    private readonly helper: SourceProcessingHelper,
    private readonly scheduler: SourceReindexScheduler,
  ) {
    super();
  }

  async process(job: Job<SourceReindexJobData>): Promise<void> {
    const { sourceId, orgId } = job.data;
    this.logger.log({ jobId: job.id, sourceId, orgId }, 'Re-indexing source');
    await observeJob(job, () =>
      this.contextService.run(async () => {
        this.contextService.set('orgId', orgId);
        if (
          !(await this.admitOrgProcessing.execute(
            new AdmitOrgProcessingQuery(orgId),
          ))
        ) {
          this.logger.warn({ jobId: job.id, orgId }, 'Organisation deleted');
          return;
        }
        await this.reindex(job);
      }),
    );
  }

  private async reindex(job: Job<SourceReindexJobData>): Promise<void> {
    const { sourceId, orgId } = job.data;
    let attemptModelId: string | null = null;
    try {
      attemptModelId = await this.scheduler.currentModelId(orgId);
      await this.reindexUntilCurrent(job);
    } catch (error) {
      this.logger.error({ sourceId, err: error as Error }, 'Re-index failed');
      const { final, rethrow } = classifyJobFailure(job, error);
      if (final) await this.settleFailure(job, error, attemptModelId);
      if (rethrow) throw rethrow;
    }
  }

  // The job id is the source id, so a source cannot be queued again while
  // its job runs: a model permitted meanwhile flags the source without a new
  // job, and the job takes another pass itself.
  private async reindexUntilCurrent(
    job: Job<SourceReindexJobData>,
  ): Promise<void> {
    const { sourceId, orgId } = job.data;
    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      const outcome = await processingStage('reindex.indexing', () =>
        this.reindexer.reindex(sourceId, orgId),
      );
      this.logger.log({ sourceId, outcome, pass }, 'Re-index finished');
      if (outcome === 'skipped') return;
      if (!(await this.reindexRepository.isReindexing(sourceId))) return;
    }
  }

  // The stored text stays; without a recorded model the next permitted
  // embedding model picks the source up again. When another model was
  // permitted during the attempt, the source is not failed for the old one:
  // the next sweep queues it for the new one.
  private async settleFailure(
    job: Job<SourceReindexJobData>,
    error: unknown,
    attemptModelId: string | null,
  ): Promise<void> {
    const { sourceId, orgId } = job.data;
    const currentModelId = await this.scheduler.currentModelId(orgId);
    if (currentModelId && currentModelId !== attemptModelId) {
      await this.reindexRepository.deferReindex(sourceId);
      return;
    }
    const failed = await this.reindexRepository.failReindex(sourceId, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: classifySourceProcessingError(error),
    });
    if (failed) await this.helper.cleanupIndex(sourceId);
  }
}
