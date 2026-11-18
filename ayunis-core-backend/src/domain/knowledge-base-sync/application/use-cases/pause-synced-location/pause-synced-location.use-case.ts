import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { outagePauseEnd } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import { PauseSourceProcessingCommand } from 'src/domain/sources/application/use-cases/pause-source-processing/pause-source-processing.command';
import { PauseSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/pause-source-processing/pause-source-processing.use-case';
import { PauseSyncedLocationCommand } from './pause-synced-location.command';

/**
 * Backs off from a provider outage (OCR, embeddings, the source system):
 * the location's sync pauses until the returned time instead of failing its
 * files one by one; its other jobs wait for the pause too. `null` when the
 * failure is no outage, or the job paused often enough and fails as usual.
 */
@Injectable()
export class PauseSyncedLocationUseCase {
  private readonly logger = new Logger(PauseSyncedLocationUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly pauseSourceProcessing: PauseSourceProcessingUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: PauseSyncedLocationCommand): Promise<Date | null> {
    const { locationId, error, pausesMade, processingSourceId } =
      command.params;
    const until = outagePauseEnd(error, pausesMade, new Date());
    if (!until) return null;
    this.logger.warn(
      { locationId, until, pausesMade, err: error as Error },
      'Pausing the location sync for a provider outage',
    );
    await this.repository.pause(locationId, until);
    // The stale-processing cleanup would otherwise fail a replacement that
    // waits for the pause longer than a job runs.
    if (processingSourceId)
      await this.pauseSourceProcessing.execute(
        new PauseSourceProcessingCommand(processingSourceId),
      );
    return until;
  }
}
