import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindSetUpConnectorQuery } from 'src/domain/connectors/application/use-cases/find-set-up-connector/find-set-up-connector.query';
import { FindSetUpConnectorUseCase } from 'src/domain/connectors/application/use-cases/find-set-up-connector/find-set-up-connector.use-case';
import { AssertKnowledgeBaseWriteAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.query';
import { AssertKnowledgeBaseWriteAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.use-case';
import {
  KnowledgeBaseSyncDisabledError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedLocationRegistrar } from 'src/domain/knowledge-base-sync/application/services/synced-location-registrar.service';
import { EnabledSyncProviders } from 'src/domain/knowledge-base-sync/application/services/enabled-sync-providers.service';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import { AddSyncedLocationCommand } from './add-synced-location.command';

/**
 * Adds a location to a knowledge base the current user may change, through
 * the organization's connector for the product, and queues its first sync,
 * which lists it.
 */
@Injectable()
export class AddSyncedLocationUseCase {
  private readonly logger = new Logger(AddSyncedLocationUseCase.name);

  constructor(
    private readonly writeAccess: AssertKnowledgeBaseWriteAccessUseCase,
    private readonly findConnector: FindSetUpConnectorUseCase,
    private readonly registrar: SyncedLocationRegistrar,
    private readonly providers: EnabledSyncProviders,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    command: AddSyncedLocationCommand,
  ): Promise<ConnectorSyncedLocation> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId, product: command.product },
      'execute',
    );
    if (!this.providers.includes(SyncedLocationProvider.CONNECTOR))
      throw new KnowledgeBaseSyncDisabledError();
    const knowledgeBase = await this.writeAccess.execute(
      new AssertKnowledgeBaseWriteAccessQuery(command.knowledgeBaseId),
    );
    const connector = await this.findConnector.execute(
      new FindSetUpConnectorQuery(command.product),
    );
    return this.registrar.register(
      new ConnectorSyncedLocation({
        orgId: knowledgeBase.orgId,
        knowledgeBaseId: knowledgeBase.id,
        connectorId: connector.id,
        location: command.location.trim(),
      }),
    );
  }
}
