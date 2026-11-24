import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import type { UUID } from 'crypto';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import {
  OPARL_DOCUMENTS_JOB,
  OPARL_SYNC_QUEUE,
  OPARL_SYNC_SYSTEM_JOB,
} from './oparl-sync.constants';
import type {
  OparlDocumentsJobData,
  OparlSyncSystemJobData,
} from './oparl-sync-system.job';

/**
 * One job ID per system: BullMQ adds no job under an ID it still holds, so
 * a system has at most one run queued or running across all instances. The
 * job is removed once it ends, so the next one can be queued.
 */
export function oparlSyncJobId(systemId: UUID): string {
  return `oparl-system-${systemId}`;
}

export function oparlDocumentsJobId(systemId: UUID): string {
  return `oparl-documents-${systemId}`;
}

const OPARL_SYNC_JOB_OPTIONS: JobsOptions = {
  // Remote failures are recorded on the run, not thrown; a thrown attempt
  // (e.g. the database was unreachable) resumes from the job's progress.
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: true,
  removeOnFail: true,
};

// Below every sync (jobs without a priority come first): reading files can
// take hours and gives its slot back between slices.
const OPARL_DOCUMENTS_JOB_OPTIONS: JobsOptions = {
  ...OPARL_SYNC_JOB_OPTIONS,
  priority: 10,
};

@Injectable()
export class OparlSyncJobsProducer extends OparlSyncJobsPort {
  private readonly logger = new Logger(OparlSyncJobsProducer.name);

  constructor(
    @InjectQueue(OPARL_SYNC_QUEUE)
    private readonly queue: Queue<
      OparlSyncSystemJobData | OparlDocumentsJobData
    >,
  ) {
    super();
  }

  async enqueue(systemIds: UUID[]): Promise<void> {
    if (systemIds.length === 0) return;
    this.logger.log({ count: systemIds.length }, 'Enqueuing OParl syncs');
    await this.queue.addBulk(
      systemIds.map((systemId) => ({
        name: OPARL_SYNC_SYSTEM_JOB,
        data: { systemId },
        opts: { jobId: oparlSyncJobId(systemId), ...OPARL_SYNC_JOB_OPTIONS },
      })),
    );
  }

  async withRunQueued(systemIds: UUID[]): Promise<UUID[]> {
    const jobs = await Promise.all(
      systemIds.map((systemId) => this.queue.getJob(oparlSyncJobId(systemId))),
    );
    return systemIds.filter((_, index) => jobs[index] !== undefined);
  }

  async enqueueDocuments(systemIds: UUID[]): Promise<void> {
    if (systemIds.length === 0) return;
    this.logger.log(
      { count: systemIds.length },
      'Enqueuing OParl document jobs',
    );
    await this.queue.addBulk(
      systemIds.map((systemId) => ({
        name: OPARL_DOCUMENTS_JOB,
        data: { systemId },
        opts: {
          jobId: oparlDocumentsJobId(systemId),
          ...OPARL_DOCUMENTS_JOB_OPTIONS,
        },
      })),
    );
  }
}
