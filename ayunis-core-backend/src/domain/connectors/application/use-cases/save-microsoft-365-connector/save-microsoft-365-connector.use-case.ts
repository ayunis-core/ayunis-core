import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';
import {
  ConnectorCredentialsRequiredError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import {
  type Microsoft365ConnectorOverview,
  toMicrosoft365ConnectorOverview,
} from 'src/domain/connectors/application/models/microsoft-365-connector-overview';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type {
  Microsoft365Credentials,
  Microsoft365Setup,
} from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection';
import { SaveMicrosoft365ConnectorCommand } from './save-microsoft-365-connector.command';

/** Sets up the organization's own Entra app, or changes its setup. */
@Injectable()
export class SaveMicrosoft365ConnectorUseCase {
  private readonly logger = new Logger(SaveMicrosoft365ConnectorUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly credentialEncryption: ConnectorCredentialEncryptionPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    command: SaveMicrosoft365ConnectorCommand,
  ): Promise<Microsoft365ConnectorOverview> {
    const { orgId } = getRequiredUserContext(this.contextService);
    const replacesSecret = command.clientSecret !== undefined;
    this.logger.log({ orgId, replacesSecret }, 'execute');

    const setup: Microsoft365Setup = {
      tenantId: command.tenantId,
      clientId: command.clientId,
    };
    const connector =
      command.clientSecret === undefined
        ? await this.updateSetupKeepingSecret(orgId, setup)
        : await this.setUp(orgId, setup, {
            clientSecret: command.clientSecret,
          });
    return toMicrosoft365ConnectorOverview(connector);
  }

  private async setUp(
    orgId: UUID,
    setup: Microsoft365Setup,
    credentials: Microsoft365Credentials,
  ): Promise<Connector> {
    const encryptedCredentials = await this.credentialEncryption.encrypt(
      JSON.stringify(credentials),
    );
    return this.connectorsRepository.upsert(
      new Connector({
        orgId,
        product: ConnectorProduct.MICROSOFT_365,
        setup,
        encryptedCredentials,
      }),
    );
  }

  private async updateSetupKeepingSecret(
    orgId: UUID,
    setup: Microsoft365Setup,
  ): Promise<Connector> {
    const connector = await this.connectorsRepository.updateSetupOfSetUp(
      orgId,
      ConnectorProduct.MICROSOFT_365,
      setup,
    );
    if (!connector) {
      throw new ConnectorCredentialsRequiredError(
        ConnectorProduct.MICROSOFT_365,
      );
    }
    return connector;
  }
}
