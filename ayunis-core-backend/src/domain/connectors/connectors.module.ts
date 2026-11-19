import { Module } from '@nestjs/common';
import { LocalConnectorsRepositoryModule } from './infrastructure/persistence/local/local-connectors-repository.module';
import { ConnectorCredentialEncryptionPort } from './application/ports/connector-credential-encryption.port';
import { ConnectorCredentialEncryptionService } from './infrastructure/encryption/connector-credential-encryption.service';
import { EntraAppTokenPort } from './application/ports/entra-app-token.port';
import { EntraAppTokenService } from './infrastructure/entra/entra-app-token.service';
import { Microsoft365AppTokenService } from './application/services/microsoft-365-app-token.service';
import { Microsoft365ConnectionTestService } from './application/services/microsoft-365-connection-test.service';
import { ListConnectorsUseCase } from './application/use-cases/list-connectors/list-connectors.use-case';
import { GetMicrosoft365ConnectorUseCase } from './application/use-cases/get-microsoft-365-connector/get-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorUseCase } from './application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.use-case';
import { RemoveConnectionUseCase } from './application/use-cases/remove-connection/remove-connection.use-case';
import { TestMicrosoft365ConnectionUseCase } from './application/use-cases/test-microsoft-365-connection/test-microsoft-365-connection.use-case';
import { ConnectorsController } from './presenters/http/connectors.controller';
import { SharePointLocationsController } from './presenters/http/sharepoint-locations.controller';
import { ConnectorSyncAdapterRegistry } from './application/connector-sync-adapter.registry';
import { ConnectorSyncAccessService } from './application/services/connector-sync-access.service';
import { ListConnectorChangesUseCase } from './application/use-cases/list-connector-changes/list-connector-changes.use-case';
import { FetchConnectorItemContentUseCase } from './application/use-cases/fetch-connector-item-content/fetch-connector-item-content.use-case';
import { FindSetUpConnectorUseCase } from './application/use-cases/find-set-up-connector/find-set-up-connector.use-case';
import { MicrosoftGraphPort } from './application/ports/microsoft-graph.port';
import { MicrosoftGraphClient } from './infrastructure/microsoft-graph/microsoft-graph.client';
import { Microsoft365GraphTokensService } from './application/services/microsoft-365-graph-tokens.service';
import { SharePointLocationResolver } from './application/services/sharepoint/sharepoint-location-resolver.service';
import { SharePointListing } from './application/services/sharepoint/sharepoint-listing.service';
import { SharePointSyncAdapter } from './application/services/sharepoint/sharepoint-sync.adapter';
import { ResolveSharePointLocationUseCase } from './application/use-cases/resolve-sharepoint-location/resolve-sharepoint-location.use-case';

@Module({
  imports: [LocalConnectorsRepositoryModule],
  controllers: [ConnectorsController, SharePointLocationsController],
  providers: [
    {
      provide: ConnectorCredentialEncryptionPort,
      useClass: ConnectorCredentialEncryptionService,
    },
    { provide: EntraAppTokenPort, useClass: EntraAppTokenService },
    Microsoft365AppTokenService,
    Microsoft365ConnectionTestService,
    ListConnectorsUseCase,
    GetMicrosoft365ConnectorUseCase,
    SaveMicrosoft365ConnectorUseCase,
    RemoveConnectionUseCase,
    TestMicrosoft365ConnectionUseCase,
    { provide: MicrosoftGraphPort, useClass: MicrosoftGraphClient },
    Microsoft365GraphTokensService,
    SharePointLocationResolver,
    SharePointListing,
    SharePointSyncAdapter,
    {
      provide: ConnectorSyncAdapterRegistry,
      useFactory: (sharePoint: SharePointSyncAdapter) =>
        new ConnectorSyncAdapterRegistry([sharePoint]),
      inject: [SharePointSyncAdapter],
    },
    ResolveSharePointLocationUseCase,
    ConnectorSyncAccessService,
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
  ],
  exports: [
    ListConnectorsUseCase,
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
    ResolveSharePointLocationUseCase,
  ],
})
export class ConnectorsModule {}
