import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import { createHash, type UUID } from 'crypto';
import {
  SyncedFileJobsPort,
  type SyncedFileJobData,
} from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { KNOWLEDGE_BASE_SYNC_QUEUE } from './knowledge-base-sync.constants';

const SYNCED_FILE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
};

/**
 * One job ID per document and version: queued twice, it is one job. Versions
 * are provider strings (and may contain the `:` BullMQ forbids), so hashed.
 */
function syncedFileJobId(job: SyncedFileJobData): string {
  const version = createHash('sha256')
    .update(job.version)
    .digest('hex')
    .slice(0, 32);
  return `${job.sourceId}-${version}`;
}

@Injectable()
export class SyncedFileJobsProducer extends SyncedFileJobsPort {
  private readonly logger = new Logger(SyncedFileJobsProducer.name);

  constructor(
    private readonly orgAccess: AssertOrgActiveUseCase,
    @InjectQueue(KNOWLEDGE_BASE_SYNC_QUEUE)
    private readonly queue: Queue<SyncedFileJobData>,
  ) {
    super();
  }

  // Under the organisation lifecycle lock like the other ingestion
  // producers, so no job is created after the organisation is deleted.
  @Transactional()
  async enqueue(orgId: UUID, jobs: SyncedFileJobData[]): Promise<void> {
    if (jobs.length === 0) return;
    await this.orgAccess.execute({ orgId, lockForLifecycle: true });
    this.logger.log({ orgId, count: jobs.length }, 'Enqueuing synced files');
    await this.queue.addBulk(
      jobs.map((data) => ({
        name: 'sync-file',
        data,
        opts: { jobId: syncedFileJobId(data), ...SYNCED_FILE_JOB_OPTIONS },
      })),
    );
  }
}
