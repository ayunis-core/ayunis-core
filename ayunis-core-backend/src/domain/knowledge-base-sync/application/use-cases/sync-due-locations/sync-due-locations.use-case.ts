import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncRunsPort } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { EnabledSyncProviders } from 'src/domain/knowledge-base-sync/application/services/enabled-sync-providers.service';
import {
  nextSyncsAfter,
  type NextSyncs,
} from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import { SyncDueLocationsCommand } from './sync-due-locations.command';

/** At most this many locations per sweep; the rest follow a sweep later. */
const SWEEP_BATCH_SIZE = 500;

/**
 * The schedule: queues a sync of every location of an enabled provider whose
 * next sync is due and that is not paused; a location of a switched-off
 * provider stays due until it is switched on again. Each due location is
 * taken by one sweep, which moves its next sync on by its provider's
 * interval, so a run lost with its queue is retried then; the run itself
 * schedules the next one when it ends.
 */
@Injectable()
export class SyncDueLocationsUseCase {
  private readonly logger = new Logger(SyncDueLocationsUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly runs: SyncRunsPort,
    private readonly providers: EnabledSyncProviders,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: SyncDueLocationsCommand): Promise<number> {
    const next = nextSyncsAfter(command.now);
    const enabled: Partial<NextSyncs> = Object.fromEntries(
      this.providers.all().map((provider) => [provider, next[provider]]),
    );
    const due = await this.repository.claimDue(
      command.now,
      enabled,
      SWEEP_BATCH_SIZE,
    );
    await this.runs.enqueue(
      due.map(({ id, orgId }) => ({ orgId, locationId: id })),
    );
    if (due.length > 0)
      this.logger.log({ count: due.length }, 'Queued due location syncs');
    return due.length;
  }
}
