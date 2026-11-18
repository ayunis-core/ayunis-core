import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedConnectorError } from 'src/domain/connectors/application/connectors.errors';
import {
  ConnectorSyncOutcome,
  type ConnectorChangesResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import { ConnectorSyncAccessService } from 'src/domain/connectors/application/services/connector-sync-access.service';
import { ListConnectorChangesCommand } from './list-connector-changes.command';

/**
 * The changes below a synced location since the cursor, with the
 * organization's own connector access. Runs without a user, e.g. in a sync
 * job, so the organization comes with the command.
 */
@Injectable()
export class ListConnectorChangesUseCase {
  private readonly logger = new Logger(ListConnectorChangesUseCase.name);

  constructor(private readonly access: ConnectorSyncAccessService) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    command: ListConnectorChangesCommand,
  ): Promise<ConnectorChangesResult> {
    this.logger.log(
      { connectorId: command.connectorId, orgId: command.orgId },
      'execute',
    );
    const syncable = await this.access.resolve(
      command.connectorId,
      command.orgId,
    );
    if (!syncable) return { outcome: ConnectorSyncOutcome.ACCESS_LOST };
    return syncable.adapter.listChanges(
      syncable.connector,
      command.location,
      command.cursor,
    );
  }
}
