import { Module } from '@nestjs/common';
import { ConnectorsInternalModule } from './connectors-internal.module';
import { ListConnectorsUseCase } from './application/use-cases/list-connectors/list-connectors.use-case';
import { RemoveConnectionUseCase } from './application/use-cases/remove-connection/remove-connection.use-case';
import { ConnectorsController } from './presenters/http/connectors.controller';
import { ConnectorSyncAccessService } from './application/services/connector-sync-access.service';
import { ListConnectorChangesUseCase } from './application/use-cases/list-connector-changes/list-connector-changes.use-case';
import { FetchConnectorItemContentUseCase } from './application/use-cases/fetch-connector-item-content/fetch-connector-item-content.use-case';
import { FindSetUpConnectorUseCase } from './application/use-cases/find-set-up-connector/find-set-up-connector.use-case';
import { ResolveConnectorLocationUseCase } from './application/use-cases/resolve-connector-location/resolve-connector-location.use-case';

/**
 * Product-neutral: connectors, their credentials and the sync contract.
 * Providers import it and register their adapter with the registry of
 * `ConnectorsInternalModule`; it imports none of them. Exports only use
 * cases.
 */
@Module({
  imports: [ConnectorsInternalModule],
  controllers: [ConnectorsController],
  providers: [
    ConnectorSyncAccessService,
    ListConnectorsUseCase,
    RemoveConnectionUseCase,
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
    ResolveConnectorLocationUseCase,
  ],
  exports: [
    ListConnectorsUseCase,
    RemoveConnectionUseCase,
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
    ResolveConnectorLocationUseCase,
  ],
})
export class ConnectorsCoreModule {}
