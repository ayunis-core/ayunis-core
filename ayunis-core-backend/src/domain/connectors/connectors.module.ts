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
import { ConnectorSyncAdapterRegistry } from './application/connector-sync-adapter.registry';
import { ConnectorSyncAccessService } from './application/services/connector-sync-access.service';
import { ListConnectorChangesUseCase } from './application/use-cases/list-connector-changes/list-connector-changes.use-case';
import { FetchConnectorItemContentUseCase } from './application/use-cases/fetch-connector-item-content/fetch-connector-item-content.use-case';
import { FindSetUpConnectorUseCase } from './application/use-cases/find-set-up-connector/find-set-up-connector.use-case';

@Module({
  imports: [LocalConnectorsRepositoryModule],
  controllers: [ConnectorsController],
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
    // No product syncs yet; Microsoft 365 adds its adapter here (AYC-1636).
    {
      provide: ConnectorSyncAdapterRegistry,
      useFactory: () => new ConnectorSyncAdapterRegistry([]),
    },
    ConnectorSyncAccessService,
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
  ],
  exports: [
    ListConnectorChangesUseCase,
    FetchConnectorItemContentUseCase,
    FindSetUpConnectorUseCase,
  ],
})
export class ConnectorsModule {}
