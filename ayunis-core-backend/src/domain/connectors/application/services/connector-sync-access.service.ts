import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import type { ConnectorSyncAdapter } from 'src/domain/connectors/application/ports/connector-sync-adapter.port';
import { ConnectorSyncAdapterRegistry } from 'src/domain/connectors/application/connector-sync-adapter.registry';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';

export interface SyncableConnector {
  connector: Connector;
  adapter: ConnectorSyncAdapter;
}

@Injectable()
export class ConnectorSyncAccessService {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly adapters: ConnectorSyncAdapterRegistry,
  ) {}

  /**
   * The connector with its product's adapter, or `null` while the connector
   * is gone, belongs to another organization, is not set up or has no
   * adapter: to the sync engine, all of these mean access is lost.
   */
  async resolve(
    connectorId: UUID,
    orgId: UUID,
  ): Promise<SyncableConnector | null> {
    const connector = await this.connectorsRepository.findById(connectorId);
    if (
      connector?.orgId !== orgId ||
      connector.status !== ConnectorStatus.SET_UP
    )
      return null;
    const adapter = this.adapters.find(connector.product);
    return adapter ? { connector, adapter } : null;
  }
}
