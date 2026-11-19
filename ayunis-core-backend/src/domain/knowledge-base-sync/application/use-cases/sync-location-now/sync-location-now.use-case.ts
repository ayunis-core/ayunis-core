import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import { AssertKnowledgeBaseWriteAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.query';
import { AssertKnowledgeBaseWriteAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.use-case';
import {
  KnowledgeBaseSyncDisabledError,
  SyncedLocationNotFoundError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncRunsPort } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncLocationNowCommand } from './sync-location-now.command';

/**
 * "Sync now": queues a sync of a location of a knowledge base the user may
 * change, ahead of the files waiting on the sync queue. Nothing more while
 * the location's sync is queued or running; a paused one waits for its
 * pause to end.
 */
@Injectable()
export class SyncLocationNowUseCase {
  private readonly logger = new Logger(SyncLocationNowUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly writeAccess: AssertKnowledgeBaseWriteAccessUseCase,
    private readonly runs: SyncRunsPort,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: SyncLocationNowCommand): Promise<void> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ locationId: command.locationId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      throw new KnowledgeBaseSyncDisabledError();
    const location = await this.repository.findById(command.locationId);
    if (
      location?.orgId !== orgId ||
      location.knowledgeBaseId !== command.knowledgeBaseId
    )
      throw new SyncedLocationNotFoundError(command.locationId);
    await this.writeAccess.execute(
      new AssertKnowledgeBaseWriteAccessQuery(location.knowledgeBaseId),
    );
    await this.runs.enqueue([{ orgId, locationId: location.id }]);
  }
}
