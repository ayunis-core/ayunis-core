import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DelayedError, type Job } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { ingestionConcurrency } from 'src/config/ingestion.config';
import { FeatureFlag } from 'src/config/features.config';
import { OparlSyncInterruptedError } from 'src/domain/oparl/application/oparl.errors';
import { ProcessOparlDocumentsCommand } from 'src/domain/oparl/application/use-cases/process-oparl-documents/process-oparl-documents.command';
import { ProcessOparlDocumentsUseCase } from 'src/domain/oparl/application/use-cases/process-oparl-documents/process-oparl-documents.use-case';
import { RunOparlSyncCommand } from 'src/domain/oparl/application/use-cases/run-oparl-sync/run-oparl-sync.command';
import { RunOparlSyncUseCase } from 'src/domain/oparl/application/use-cases/run-oparl-sync/run-oparl-sync.use-case';
import { SyncDueOparlSystemsUseCase } from 'src/domain/oparl/application/use-cases/sync-due-oparl-systems/sync-due-oparl-systems.use-case';
import { observeJob } from 'src/domain/sources/infrastructure/queue/job-telemetry';
import {
  OPARL_DOCUMENTS_JOB,
  OPARL_SYNC_DUE_SYSTEMS_JOB,
  OPARL_SYNC_QUEUE,
} from './oparl-sync.constants';
import type {
  OparlDocumentsJobData,
  OparlSyncSystemJobData,
} from './oparl-sync-system.job';

type OparlJobData = OparlSyncSystemJobData | OparlDocumentsJobData;

/**
 * The worker of the OParl queue: the sweep, one run per system, and the
 * document jobs that make a system searchable, below the runs in priority. Several
 * systems sync at once (`INGESTION_OPARL_CONCURRENCY`), so a slow or
 * unreachable one does not hold up the others. With the flag off, jobs
 * still queued end without doing anything. On shutdown a run stops between
 * pages and goes back to the queue, without spending an attempt, so a
 * run of hours does not hold up a deploy; it resumes from its progress.
 */
@Processor(OPARL_SYNC_QUEUE, { concurrency: ingestionConcurrency('oparl') })
export class OparlSyncConsumer extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(OparlSyncConsumer.name);
  private readonly shutdown = new AbortController();

  constructor(
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
    private readonly runSync: RunOparlSyncUseCase,
    private readonly syncDueSystems: SyncDueOparlSystemsUseCase,
    private readonly processDocuments: ProcessOparlDocumentsUseCase,
  ) {
    super();
  }

  // Closing the worker waits for its running jobs, so they must stop first;
  // the ingestion worker closes it before this module is destroyed.
  @OnWorkerEvent('closing')
  onClosing(): void {
    this.shutdown.abort();
  }

  onModuleDestroy(): void {
    this.shutdown.abort();
  }

  async process(job: Job<OparlJobData>, token?: string): Promise<void> {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Oparl}`)) {
      this.logger.log({ jobId: job.id }, 'OParl is disabled, skipping job');
      return;
    }
    if (job.name === OPARL_SYNC_DUE_SYSTEMS_JOB) {
      await observeJob(job, () =>
        this.contextService.run(() => this.syncDueSystems.execute()),
      );
      return;
    }
    const yielded = await observeJob(job, () =>
      this.contextService.run(() =>
        job.name === OPARL_DOCUMENTS_JOB
          ? this.documents(job as Job<OparlDocumentsJobData>)
          : this.run(job as Job<OparlSyncSystemJobData>),
      ),
    );
    // Outside the telemetry, which would count it as a failure.
    if (yielded) {
      await job.moveToDelayed(Date.now() + 1_000, token);
      throw new DelayedError();
    }
  }

  /** `true` when a shutdown interrupted the run. */
  private async run(job: Job<OparlSyncSystemJobData>): Promise<boolean> {
    try {
      await this.runSync.execute(this.command(job));
      return false;
    } catch (error) {
      if (error instanceof OparlSyncInterruptedError) return true;
      throw error;
    }
  }

  /** `true` when a shutdown interrupted the job or its slice ended with work left. */
  private async documents(job: Job<OparlDocumentsJobData>): Promise<boolean> {
    const saveProgress = (progress: OparlDocumentsJobData['progress']) =>
      job.updateData({ ...job.data, progress });
    try {
      const next = await this.processDocuments.execute(
        new ProcessOparlDocumentsCommand(
          job.data.systemId,
          job.data.progress ?? null,
          saveProgress,
          this.shutdown.signal,
        ),
      );
      if (next) await saveProgress(next);
      return next !== null;
    } catch (error) {
      if (error instanceof OparlSyncInterruptedError) return true;
      throw error;
    }
  }

  private command(job: Job<OparlSyncSystemJobData>): RunOparlSyncCommand {
    return new RunOparlSyncCommand(
      job.data.systemId,
      job.data.progress ?? null,
      (progress) => job.updateData({ ...job.data, progress }),
      this.shutdown.signal,
    );
  }
}
