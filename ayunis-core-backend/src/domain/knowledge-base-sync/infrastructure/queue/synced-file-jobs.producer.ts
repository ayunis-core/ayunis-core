import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import { createHash, type UUID } from 'crypto';
import {
  SyncedFileJobsPort,
  type SyncedFileJobData,
  type SyncRunReference,
} from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { chunk } from 'src/common/util/chunk';
import { DOCUMENT_JOB_OPTIONS } from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import {
  KNOWLEDGE_BASE_SYNC_QUEUE,
  SYNCED_FILE_JOB,
  SYNCED_FILE_JOB_PRIORITY,
} from './knowledge-base-sync.constants';

const REMOVAL_BATCH_SIZE = 100;

// Retried like uploads, since they run the same document pipeline. A
// completed job is removed at once: one that ended without processing its
// version (access lost, the file changed meanwhile) must not keep the next
// sync from queueing that version again under the same ID. Behind the
// location syncs on the same queue, so a sync starts without waiting for
// the files queued before it.
const SYNCED_FILE_JOB_OPTIONS: JobsOptions = {
  ...DOCUMENT_JOB_OPTIONS,
  removeOnComplete: true,
  priority: SYNCED_FILE_JOB_PRIORITY,
};

/**
 * One job ID per document and version: queued twice, it is one job. Versions
 * are provider strings (and may contain the `:` BullMQ forbids), so hashed.
 */
function syncedFileJobId(
  job: Pick<SyncedFileJobData, 'sourceId' | 'version'>,
): string {
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
  async enqueue(
    orgId: UUID,
    jobs: SyncedFileJobData[],
    run: SyncRunReference,
  ): Promise<void> {
    if (jobs.length === 0) return;
    await this.orgAccess.execute({ orgId, lockForLifecycle: true });
    this.logger.log({ orgId, count: jobs.length }, 'Enqueuing synced files');
    await this.queue.addBulk(
      jobs.map((data) => ({
        name: SYNCED_FILE_JOB,
        data,
        opts: {
          jobId: syncedFileJobId(data),
          ...SYNCED_FILE_JOB_OPTIONS,
          parent: run,
          // A file that fails for good does not keep its run from going on.
          ignoreDependencyOnFailure: true,
        },
      })),
    );
  }

  async remove(
    jobs: Pick<SyncedFileJobData, 'sourceId' | 'version'>[],
  ): Promise<void> {
    for (const batch of chunk(jobs.map(syncedFileJobId), REMOVAL_BATCH_SIZE)) {
      // BullMQ leaves a job a worker holds in place (and reports 0).
      await Promise.all(
        batch.map((jobId) =>
          this.queue.remove(jobId).catch((error: unknown) => {
            this.logger.warn(
              { jobId, err: error as Error },
              'Could not remove a synced file job',
            );
          }),
        ),
      );
    }
  }
}
