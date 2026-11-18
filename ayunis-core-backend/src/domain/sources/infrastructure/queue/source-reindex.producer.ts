import { Transactional } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type JobsOptions } from 'bullmq';
import type { UUID } from 'crypto';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import {
  SourceReindexProcessingPort,
  type SourceReindexJobData,
} from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { chunk } from 'src/common/util/chunk';
import { SOURCE_REINDEX_QUEUE } from './source-reindex.constants';
import { STANDARD_JOB_OPTIONS } from './bullmq-job.helpers';

const ADD_BATCH_SIZE = 500;
// BullMQ's lowest priority; lower numbers run first.
const MAX_PRIORITY = 2_097_152;

// Settled jobs are removed: the job id is the source id, and a kept job
// would swallow the source's next re-index after another model change.
const REINDEX_JOB_OPTIONS: JobsOptions = {
  ...STANDARD_JOB_OPTIONS,
  removeOnComplete: true,
  removeOnFail: true,
};

@Injectable()
export class SourceReindexProducer extends SourceReindexProcessingPort {
  private readonly logger = new Logger(SourceReindexProducer.name);

  constructor(
    private readonly orgAccess: AssertOrgActiveUseCase,
    @InjectQueue(SOURCE_REINDEX_QUEUE)
    private readonly queue: Queue<SourceReindexJobData>,
  ) {
    super();
  }

  @Transactional()
  async enqueue(orgId: UUID, sourceIds: UUID[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.orgAccess.execute({ orgId, lockForLifecycle: true });
    this.logger.log(
      { orgId, sourceCount: sourceIds.length },
      'Enqueuing source re-index jobs',
    );
    // An org's n-th source gets priority n, so orgs take turns instead of a
    // large org's re-index holding up a small one's.
    let position = 0;
    for (const batch of chunk(sourceIds, ADD_BATCH_SIZE)) {
      await this.queue.addBulk(
        batch.map((sourceId) => ({
          name: 'reindex-source',
          data: { sourceId, orgId },
          opts: {
            ...REINDEX_JOB_OPTIONS,
            jobId: sourceId,
            priority: Math.min(++position, MAX_PRIORITY),
          },
        })),
      );
    }
  }
}
