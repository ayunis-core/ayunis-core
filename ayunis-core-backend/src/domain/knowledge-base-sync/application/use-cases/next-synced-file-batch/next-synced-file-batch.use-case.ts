import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { NextSyncedFileBatchQuery } from './next-synced-file-batch.query';

/** Bounds a run's share of the sync queue and the jobs it holds at once. */
export const SYNCED_FILE_BATCH_SIZE = 20;

/**
 * The next batch of a location's files to process in its sync, by file ID
 * after the previous batch, so a run feeds each file at most once and ends.
 * A file whose document is behind its version is fed, also one whose
 * earlier job ended without processing it. Empty once every file is fed, the
 * location is gone or no longer accessible, or connectors are switched off.
 */
@Injectable()
export class NextSyncedFileBatchUseCase {
  private readonly logger = new Logger(NextSyncedFileBatchUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(query: NextSyncedFileBatchQuery): Promise<SyncedFileJobData[]> {
    this.logger.log({ locationId: query.locationId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      return [];
    const location = await this.repository.findById(query.locationId);
    if (location?.state !== SyncedLocationState.ACTIVE) return [];
    const files = await this.repository.findFilesToProcess(
      location.id,
      query.afterFileId,
      SYNCED_FILE_BATCH_SIZE,
    );
    return files.flatMap((file) =>
      file.sourceId
        ? [
            {
              orgId: location.orgId,
              knowledgeBaseId: location.knowledgeBaseId,
              locationId: location.id,
              syncedFileId: file.id,
              sourceId: file.sourceId,
              version: file.version,
            },
          ]
        : [],
    );
  }
}
