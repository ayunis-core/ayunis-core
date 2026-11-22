import { Module } from '@nestjs/common';
import { ConnectorCredentialEncryptionPort } from './application/ports/connector-credential-encryption.port';
import { ConnectorSyncAdapterRegistry } from './application/connector-sync-adapter.registry';
import { ConnectorCredentialEncryptionService } from './infrastructure/encryption/connector-credential-encryption.service';
import { LocalConnectorsRepositoryModule } from './infrastructure/persistence/local/local-connectors-repository.module';

/**
 * The connectors' persistence, credential encryption and adapter registry,
 * for the core and the providers only: `ConnectorsModule` does not export
 * it, so other modules never read or decrypt credentials themselves.
 */
@Module({
  imports: [LocalConnectorsRepositoryModule],
  providers: [
    {
      provide: ConnectorCredentialEncryptionPort,
      useClass: ConnectorCredentialEncryptionService,
    },
    {
      provide: ConnectorSyncAdapterRegistry,
      useFactory: () => new ConnectorSyncAdapterRegistry(),
    },
  ],
  exports: [
    LocalConnectorsRepositoryModule,
    ConnectorCredentialEncryptionPort,
    ConnectorSyncAdapterRegistry,
  ],
})
export class ConnectorsInternalModule {}
