import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DelayedError, Job, Queue, WaitingChildrenError } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { SyncedLocationNotFoundError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedFileJobsPort } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { FinishLocationSyncCommand } from 'src/domain/knowledge-base-sync/application/use-cases/finish-location-sync/finish-location-sync.command';
import { FinishLocationSyncUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/finish-location-sync/finish-location-sync.use-case';
import { NextSyncedFileBatchQuery } from 'src/domain/knowledge-base-sync/application/use-cases/next-synced-file-batch/next-synced-file-batch.query';
import { NextSyncedFileBatchUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/next-synced-file-batch/next-synced-file-batch.use-case';
import { PauseSyncedLocationCommand } from 'src/domain/knowledge-base-sync/application/use-cases/pause-synced-location/pause-synced-location.command';
import { PauseSyncedLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/pause-synced-location/pause-synced-location.use-case';
import { SyncDueLocationsCommand } from 'src/domain/knowledge-base-sync/application/use-cases/sync-due-locations/sync-due-locations.command';
import { SyncDueLocationsUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-due-locations/sync-due-locations.use-case';
import { SyncLocationCommand } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.command';
import { SyncLocationOutcome } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.result';
import { SyncLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.use-case';
import {
  isFinalAttempt,
  observeJob,
} from 'src/domain/sources/infrastructure/queue/job-telemetry';
import {
  KNOWLEDGE_BASE_SYNC_QUEUE,
  SYNC_DUE_LOCATIONS_INTERVAL_MS,
  SYNC_DUE_LOCATIONS_JOB,
  SYNC_DUE_LOCATIONS_SCHEDULER_ID,
  SYNC_RUN_JOB,
} from './knowledge-base-sync.constants';
import type { SyncRunJobData } from './sync-run.job';

/** How an attempt of a run ends: delayed, waiting for its files, or done. */
type RunStep = { delayUntil: Date } | 'waiting' | 'done';

/**
 * The jobs of the sync queue besides files: the due-location sweep, which a
 * BullMQ job scheduler adds once a minute for all instances together
 * (upserting it from every instance is idempotent), and the location runs.
 * A run lists the location's changes, then feeds its files to processing a
 * batch at a time as its children and waits for each batch to be processed
 * before the next (BullMQ's waiting-children), so a large listing never
 * fills the queue. One job ID per location keeps a location from running
 * twice at once. A run waits out a pause of its location, and pauses it for
 * a provider outage, through delays that spend no attempt.
 */
@Injectable()
export class SyncRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncRunner.name);

  constructor(
    @InjectQueue(KNOWLEDGE_BASE_SYNC_QUEUE) private readonly queue: Queue,
    private readonly contextService: ContextService,
    private readonly syncLocation: SyncLocationUseCase,
    private readonly nextBatch: NextSyncedFileBatchUseCase,
    private readonly finishSync: FinishLocationSyncUseCase,
    private readonly pauseLocation: PauseSyncedLocationUseCase,
    private readonly syncDueLocations: SyncDueLocationsUseCase,
    private readonly fileJobs: SyncedFileJobsPort,
  ) {}

  onApplicationBootstrap(): void {
    // Not awaited: an unreachable Redis must not block the boot.
    this.schedule().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Could not schedule the location syncs',
      );
    });
  }

  /**
   * Whatever the feature flags: the sweep leaves the locations of switched-off
   * providers alone.
   */
  async schedule(every = SYNC_DUE_LOCATIONS_INTERVAL_MS): Promise<void> {
    await this.queue.upsertJobScheduler(
      SYNC_DUE_LOCATIONS_SCHEDULER_ID,
      { every },
      {
        name: SYNC_DUE_LOCATIONS_JOB,
        opts: {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
        },
      },
    );
  }

  handles(job: Job): boolean {
    return job.name === SYNC_RUN_JOB || job.name === SYNC_DUE_LOCATIONS_JOB;
  }

  async process(job: Job, token?: string): Promise<void> {
    if (job.name === SYNC_DUE_LOCATIONS_JOB) {
      await observeJob(job, () =>
        this.contextService.run(() =>
          this.syncDueLocations.execute(
            new SyncDueLocationsCommand(new Date()),
          ),
        ),
      );
      return;
    }
    const run = job as Job<SyncRunJobData>;
    const step = await observeJob(run, () =>
      this.contextService.run(() => this.run(run, token)),
    );
    // Outside the telemetry, which would count either as a failure.
    if (step === 'waiting') throw new WaitingChildrenError();
    if (step !== 'done') {
      await run.moveToDelayed(step.delayUntil.getTime(), token);
      throw new DelayedError();
    }
  }

  private async run(
    job: Job<SyncRunJobData>,
    token?: string,
  ): Promise<RunStep> {
    // Runs go without a user.
    this.contextService.set('orgId', job.data.orgId);
    try {
      if (!job.data.feeding) {
        const listed = await this.list(job);
        if (listed) return listed;
      }
      return await this.feed(job, token);
    } catch (error) {
      return this.afterFailure(job, error);
    }
  }

  /** `null` to go on with the files. */
  private async list(job: Job<SyncRunJobData>): Promise<RunStep | null> {
    const result = await this.syncLocation.execute(
      new SyncLocationCommand(job.data.locationId),
    );
    switch (result.outcome) {
      case SyncLocationOutcome.THROTTLED:
      case SyncLocationOutcome.PAUSED:
        return { delayUntil: result.retryAt };
      case SyncLocationOutcome.SYNCED:
      case SyncLocationOutcome.SUPERSEDED:
        await job.updateData({ ...job.data, feeding: true, pauses: 0 });
        return null;
      case SyncLocationOutcome.ACCESS_LOST:
      case SyncLocationOutcome.DISABLED:
        return this.finish(job);
    }
  }

  private async feed(
    job: Job<SyncRunJobData>,
    token?: string,
  ): Promise<RunStep> {
    for (;;) {
      const batch = await this.nextBatch.execute(
        new NextSyncedFileBatchQuery(
          job.data.locationId,
          job.data.afterFileId ?? null,
        ),
      );
      if (batch.length === 0) return this.finish(job);
      await this.fileJobs.enqueue(job.data.orgId, batch, {
        id: job.id!,
        queue: job.queueQualifiedName,
      });
      await job.updateData({
        ...job.data,
        afterFileId: batch.at(-1)!.syncedFileId,
      });
      // False when the batch is processed already, e.g. queued before.
      if (await job.moveToWaitingChildren(token!)) return 'waiting';
    }
  }

  private async afterFailure(
    job: Job<SyncRunJobData>,
    error: unknown,
  ): Promise<RunStep> {
    // Removed meanwhile, with its knowledge base or organisation.
    if (error instanceof SyncedLocationNotFoundError) return 'done';
    const pausesMade = job.data.pauses ?? 0;
    const until = await this.pauseLocation.execute(
      new PauseSyncedLocationCommand({
        locationId: job.data.locationId,
        error,
        pausesMade,
      }),
    );
    if (until) {
      await job.updateData({ ...job.data, pauses: pausesMade + 1 });
      return { delayUntil: until };
    }
    if (isFinalAttempt(job)) await this.finish(job);
    throw error;
  }

  private async finish(job: Job<SyncRunJobData>): Promise<RunStep> {
    await this.finishSync.execute(
      new FinishLocationSyncCommand(job.data.locationId),
    );
    return 'done';
  }
}
