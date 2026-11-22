import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { UUID } from 'crypto';
import {
  SyncRunsPort,
  type SyncRunRequest,
} from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import {
  KNOWLEDGE_BASE_SYNC_QUEUE,
  SYNC_RUN_JOB,
} from './knowledge-base-sync.constants';
import type { SyncRunJobData } from './sync-run.job';

/**
 * One job ID per location: BullMQ adds no job under an ID it still holds, so
 * a location has at most one run queued, running or waiting for its files.
 * The run is removed once it ends, also after failing, so the next one can
 * be queued under the same ID.
 */
export function syncRunJobId(locationId: UUID): string {
  return `location-${locationId}`;
}

const SYNC_RUN_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: true,
};

// Without the organisation lifecycle lock of the file producers: a run
// queued after its organisation was deleted finds no location and ends.
@Injectable()
export class SyncRunsProducer extends SyncRunsPort {
  private readonly logger = new Logger(SyncRunsProducer.name);

  constructor(
    @InjectQueue(KNOWLEDGE_BASE_SYNC_QUEUE)
    private readonly queue: Queue<SyncRunJobData>,
  ) {
    super();
  }

  async enqueue(runs: SyncRunRequest[]): Promise<void> {
    if (runs.length === 0) return;
    this.logger.log({ count: runs.length }, 'Enqueuing location syncs');
    await this.queue.addBulk(
      runs.map(({ orgId, locationId }) => ({
        name: SYNC_RUN_JOB,
        data: { orgId, locationId },
        opts: { jobId: syncRunJobId(locationId), ...SYNC_RUN_JOB_OPTIONS },
      })),
    );
  }

  async remove(locationId: UUID): Promise<void> {
    const jobId = syncRunJobId(locationId);
    // BullMQ leaves a run in place (and reports 0) while it or one of its
    // files is running.
    await this.queue.remove(jobId).catch((error: unknown) => {
      this.logger.warn(
        { jobId, err: error as Error },
        'Could not remove a location sync',
      );
    });
  }
}
