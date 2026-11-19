import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedConnectorError } from 'src/domain/connectors/application/connectors.errors';
import {
  ConnectorSyncOutcome,
  type ConnectorItemContentResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import { ConnectorSyncAccessService } from 'src/domain/connectors/application/services/connector-sync-access.service';
import { FetchConnectorItemContentCommand } from './fetch-connector-item-content.command';

/** The content of one item below a synced location; runs without a user. */
@Injectable()
export class FetchConnectorItemContentUseCase {
  private readonly logger = new Logger(FetchConnectorItemContentUseCase.name);

  constructor(private readonly access: ConnectorSyncAccessService) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    command: FetchConnectorItemContentCommand,
  ): Promise<ConnectorItemContentResult> {
    this.logger.log(
      { connectorId: command.connectorId, orgId: command.orgId },
      'execute',
    );
    const syncable = await this.access.resolve(
      command.connectorId,
      command.orgId,
    );
    if (!syncable) return { outcome: ConnectorSyncOutcome.ACCESS_LOST };
    return syncable.adapter.fetchContent(
      syncable.connector,
      command.location,
      command.itemId,
    );
  }
}
