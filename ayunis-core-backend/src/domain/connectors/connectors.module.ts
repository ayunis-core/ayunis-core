import { Module } from '@nestjs/common';
import { LocalConnectorsRepositoryModule } from './infrastructure/persistence/local/local-connectors-repository.module';
import { ConnectorCredentialEncryptionPort } from './application/ports/connector-credential-encryption.port';
import { ConnectorCredentialEncryptionService } from './infrastructure/encryption/connector-credential-encryption.service';
import { ListConnectorsUseCase } from './application/use-cases/list-connectors/list-connectors.use-case';
import { ConnectorsController } from './presenters/http/connectors.controller';

@Module({
  imports: [LocalConnectorsRepositoryModule],
  controllers: [ConnectorsController],
  providers: [
    {
      provide: ConnectorCredentialEncryptionPort,
      useClass: ConnectorCredentialEncryptionService,
    },
    ListConnectorsUseCase,
  ],
})
export class ConnectorsModule {}
