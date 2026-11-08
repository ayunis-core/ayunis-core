import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { SyncReleaseNotesUseCase } from 'src/domain/release-notes/application/use-cases/sync-release-notes/sync-release-notes.use-case';
import { observeJob } from 'src/domain/sources/infrastructure/queue/job-telemetry';
import {
  RELEASE_NOTE_SYNC_INTERVAL_MS,
  RELEASE_NOTE_SYNC_JOB,
  RELEASE_NOTE_SYNC_QUEUE,
  RELEASE_NOTE_SYNC_SCHEDULER_ID,
} from './release-note-sync.constants';

/**
 * The hourly release-note sync. A BullMQ job scheduler adds one sync job per
 * hour for all replicas together (upserting it from every instance is
 * idempotent), and one worker takes each job. Its own queue keeps it from
 * waiting behind document ingestion and ingestion from waiting behind it.
 * Registered and started only with release notes on (routines on and an
 * Announcable org ID), so otherwise Announcable is never asked.
 */
@Processor(RELEASE_NOTE_SYNC_QUEUE, { autorun: false })
export class ReleaseNoteSyncConsumer
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(ReleaseNoteSyncConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly syncReleaseNotesUseCase: SyncReleaseNotesUseCase,
    @InjectQueue(RELEASE_NOTE_SYNC_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>('features.releaseNotesEnabled')) {
      this.logger.log('Release notes are off, not syncing them');
      return;
    }
    // Not awaited: an unreachable Redis must not block the boot.
    this.queue
      .upsertJobScheduler(
        RELEASE_NOTE_SYNC_SCHEDULER_ID,
        { every: RELEASE_NOTE_SYNC_INTERVAL_MS },
        {
          name: RELEASE_NOTE_SYNC_JOB,
          opts: {
            attempts: 1,
            removeOnComplete: 100,
            removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
          },
        },
      )
      .catch((error: unknown) => {
        this.logger.error(
          { err: error as Error },
          'Could not schedule the release-note sync',
        );
      });
    this.worker.run().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Release-note sync worker stopped',
      );
    });
  }

  async process(job: Job): Promise<void> {
    await observeJob(job, () =>
      this.contextService.run(() => this.syncReleaseNotesUseCase.execute()),
    );
  }
}
