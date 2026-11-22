import { Module } from '@nestjs/common';
import { LocalConnectorsRepositoryModule } from './infrastructure/persistence/local/local-connectors-repository.module';
import { ConnectorCredentialEncryptionPort } from './application/ports/connector-credential-encryption.port';
import { ConnectorCredentialEncryptionService } from './infrastructure/encryption/connector-credential-encryption.service';
import { ListConnectorsUseCase } from './application/use-cases/list-connectors/list-connectors.use-case';
import { GetMicrosoft365ConnectorUseCase } from './application/use-cases/get-microsoft-365-connector/get-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorUseCase } from './application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.use-case';
import { RemoveConnectionUseCase } from './application/use-cases/remove-connection/remove-connection.use-case';
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
    GetMicrosoft365ConnectorUseCase,
    SaveMicrosoft365ConnectorUseCase,
    RemoveConnectionUseCase,
  ],
})
export class ConnectorsModule {}
