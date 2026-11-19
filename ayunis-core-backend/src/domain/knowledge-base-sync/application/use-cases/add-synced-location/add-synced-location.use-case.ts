import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import { FindSetUpConnectorQuery } from 'src/domain/connectors/application/use-cases/find-set-up-connector/find-set-up-connector.query';
import { FindSetUpConnectorUseCase } from 'src/domain/connectors/application/use-cases/find-set-up-connector/find-set-up-connector.use-case';
import { AssertKnowledgeBaseWriteAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.query';
import { AssertKnowledgeBaseWriteAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.use-case';
import {
  KnowledgeBaseSyncDisabledError,
  SyncedLocationAlreadyExistsError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { AddSyncedLocationCommand } from './add-synced-location.command';

/**
 * Adds a location to a knowledge base the current user may change, through
 * the organization's connector for the product. Nothing is listed yet; the
 * first sync does that.
 */
@Injectable()
export class AddSyncedLocationUseCase {
  private readonly logger = new Logger(AddSyncedLocationUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly writeAccess: AssertKnowledgeBaseWriteAccessUseCase,
    private readonly findConnector: FindSetUpConnectorUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: AddSyncedLocationCommand): Promise<SyncedLocation> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId, product: command.product },
      'execute',
    );
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      throw new KnowledgeBaseSyncDisabledError();
    const knowledgeBase = await this.writeAccess.execute(
      new AssertKnowledgeBaseWriteAccessQuery(command.knowledgeBaseId),
    );
    const connector = await this.findConnector.execute(
      new FindSetUpConnectorQuery(command.product),
    );
    const location = new SyncedLocation({
      orgId: knowledgeBase.orgId,
      knowledgeBaseId: knowledgeBase.id,
      connectorId: connector.id,
      location: command.location.trim(),
    });
    if (!(await this.repository.create(location)))
      throw new SyncedLocationAlreadyExistsError(knowledgeBase.id);
    return location;
  }
}
