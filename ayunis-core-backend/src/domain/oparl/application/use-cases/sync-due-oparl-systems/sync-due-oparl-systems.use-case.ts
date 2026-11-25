import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';

const MAX_SYSTEMS_PER_SWEEP = 100;
/** A long run keeps its system claimed; one lost on the way is queued again after this. */
const CLAIM_LEASE_MS = 6 * 60 * 60 * 1000;

/**
 * The sweep: queues a run for every system whose next sync is due, and a
 * document job for every other system with document work left, so a
 * document job that failed for good does not wait for the next run.
 */
@Injectable()
export class SyncDueOparlSystemsUseCase {
  private readonly logger = new Logger(SyncDueOparlSystemsUseCase.name);

  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly documents: OparlDocumentsRepository,
    private readonly embedder: OparlChunkEmbedder,
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
    if (due.length > 0) {
      this.logger.log({ count: due.length }, 'Queueing due OParl syncs');
      await this.jobs.enqueue(due);
    }
    await this.enqueueDocumentWork();
  }

  /** Not for a system with a run queued or running: its end queues the document job. */
  private async enqueueDocumentWork(): Promise<void> {
    const model = await this.embedder.currentModel();
    const withWork = await this.documents.findSystemsWithDocumentWork(
      model?.id ?? null,
    );
    if (withWork.length === 0) return;
    const syncing = new Set(await this.jobs.withRunQueued(withWork));
    const systemIds = withWork.filter((id) => !syncing.has(id));
    if (systemIds.length > 0) await this.jobs.enqueueDocuments(systemIds);
  }
}
