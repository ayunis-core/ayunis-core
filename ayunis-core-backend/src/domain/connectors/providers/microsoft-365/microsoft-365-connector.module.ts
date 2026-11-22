import { Module } from '@nestjs/common';
import { ConnectorsCoreModule } from 'src/domain/connectors/connectors-core.module';
import { ConnectorsInternalModule } from 'src/domain/connectors/connectors-internal.module';
import { ConnectorSyncAdapterRegistry } from 'src/domain/connectors/application/connector-sync-adapter.registry';
import { EntraAppTokenPort } from './application/ports/entra-app-token.port';
import { MicrosoftGraphPort } from './application/ports/microsoft-graph.port';
import { Microsoft365AppTokenService } from './application/services/microsoft-365-app-token.service';
import { Microsoft365ConnectionTestService } from './application/services/microsoft-365-connection-test.service';
import { Microsoft365GraphTokensService } from './application/services/microsoft-365-graph-tokens.service';
import { SharePointListing } from './application/services/sharepoint/sharepoint-listing.service';
import { SharePointLocationResolver } from './application/services/sharepoint/sharepoint-location-resolver.service';
import { SharePointSyncAdapter } from './application/services/sharepoint/sharepoint-sync.adapter';
import { GetMicrosoft365ConnectorUseCase } from './application/use-cases/get-microsoft-365-connector/get-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorUseCase } from './application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.use-case';
import { TestMicrosoft365ConnectionUseCase } from './application/use-cases/test-microsoft-365-connection/test-microsoft-365-connection.use-case';
import { EntraAppTokenService } from './infrastructure/entra/entra-app-token.service';
import { MicrosoftGraphClient } from './infrastructure/microsoft-graph/microsoft-graph.client';
import { Microsoft365ConnectorController } from './presenters/http/microsoft-365-connector.controller';
import { SharePointLocationsController } from './presenters/http/sharepoint-locations.controller';

@Module({
  imports: [ConnectorsCoreModule, ConnectorsInternalModule],
  controllers: [Microsoft365ConnectorController, SharePointLocationsController],
  providers: [
    { provide: EntraAppTokenPort, useClass: EntraAppTokenService },
    { provide: MicrosoftGraphPort, useClass: MicrosoftGraphClient },
    Microsoft365AppTokenService,
    Microsoft365ConnectionTestService,
    Microsoft365GraphTokensService,
    SharePointLocationResolver,
    SharePointListing,
    SharePointSyncAdapter,
    GetMicrosoft365ConnectorUseCase,
    SaveMicrosoft365ConnectorUseCase,
    TestMicrosoft365ConnectionUseCase,
  ],
})
export class Microsoft365ConnectorModule {
  // In the constructor, so the adapter is registered before any lifecycle
  // hook can start a sync.
  constructor(
    registry: ConnectorSyncAdapterRegistry,
    sharePoint: SharePointSyncAdapter,
  ) {
    registry.register(sharePoint);
  }
}
