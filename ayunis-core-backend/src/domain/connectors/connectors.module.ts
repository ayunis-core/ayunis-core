import { Module } from '@nestjs/common';
import { ConnectorsCoreModule } from './connectors-core.module';
import { Microsoft365ConnectorModule } from './providers/microsoft-365/microsoft-365-connector.module';

/**
 * What other modules import: the core with every provider, so wherever the
 * core runs (the API, the ingestion worker) each product has its adapter.
 */
@Module({
  imports: [ConnectorsCoreModule, Microsoft365ConnectorModule],
  exports: [ConnectorsCoreModule],
})
export class ConnectorsModule {}
