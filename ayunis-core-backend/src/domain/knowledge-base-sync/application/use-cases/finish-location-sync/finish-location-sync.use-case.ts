import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { nextSyncsAfter } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import { FinishLocationSyncCommand } from './finish-location-sync.command';

/**
 * Ends a location's sync once its files are processed, or it stopped: the
 * location waits for its next scheduled sync, its provider's interval from
 * now.
 */
@Injectable()
export class FinishLocationSyncUseCase {
  private readonly logger = new Logger(FinishLocationSyncUseCase.name);

  constructor(private readonly repository: SyncedLocationsRepository) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: FinishLocationSyncCommand): Promise<void> {
    this.logger.log({ locationId: command.locationId }, 'execute');
    await this.repository.recordSyncEnded(
      command.locationId,
      nextSyncsAfter(new Date()),
    );
  }
}
