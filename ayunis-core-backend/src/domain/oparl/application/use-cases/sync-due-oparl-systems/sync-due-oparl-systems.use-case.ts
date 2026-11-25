import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';

const MAX_SYSTEMS_PER_SWEEP = 100;
/** A long run keeps its system claimed; one lost on the way is queued again after this. */
const CLAIM_LEASE_MS = 6 * 60 * 60 * 1000;

/** The sweep: queues a run for every system whose next sync is due. */
@Injectable()
export class SyncDueOparlSystemsUseCase {
  private readonly logger = new Logger(SyncDueOparlSystemsUseCase.name);

  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly jobs: OparlSyncJobsPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(): Promise<void> {
    const now = new Date();
    const due = await this.systems.claimDue(
      now,
      new Date(now.getTime() + CLAIM_LEASE_MS),
      MAX_SYSTEMS_PER_SWEEP,
    );
    if (due.length === 0) return;
    this.logger.log({ count: due.length }, 'Queueing due OParl syncs');
    await this.jobs.enqueue(due);
  }
}
