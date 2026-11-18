import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';
import {
  ConnectorCredentialsRequiredError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import {
  type Microsoft365ConnectionTestResult,
  toMicrosoft365ConnectionTestResult,
} from 'src/domain/connectors/application/models/microsoft-365-connection-test-result';
import { toMicrosoft365ConnectorOverview } from 'src/domain/connectors/application/models/microsoft-365-connector-overview';
import { Microsoft365ConnectionTestService } from 'src/domain/connectors/application/services/microsoft-365-connection-test.service';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { Microsoft365ConnectionTestOutcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';
import type {
  Microsoft365Credentials,
  Microsoft365Setup,
} from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection';
import { SaveMicrosoft365ConnectorCommand } from './save-microsoft-365-connector.command';
import type { SavedMicrosoft365Connector } from './save-microsoft-365-connector.result';

/**
 * Sets up the organization's own Entra app, or changes its setup, and tests
 * the saved connection.
 */
@Injectable()
export class SaveMicrosoft365ConnectorUseCase {
  private readonly logger = new Logger(SaveMicrosoft365ConnectorUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly credentialEncryption: ConnectorCredentialEncryptionPort,
    private readonly connectionTest: Microsoft365ConnectionTestService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    command: SaveMicrosoft365ConnectorCommand,
  ): Promise<SavedMicrosoft365Connector> {
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
    return {
      ...toMicrosoft365ConnectorOverview(connector),
      connectionTest: await this.testSavedConnection(connector),
    };
  }

  /**
   * The connector is already stored, so a failing test must not turn the
   * save into an error.
   */
  private async testSavedConnection(
    connector: Connector,
  ): Promise<Microsoft365ConnectionTestResult> {
    try {
      return await this.connectionTest.test(connector);
    } catch (error) {
      this.logger.error(
        {
          orgId: connector.orgId,
          errorName: error instanceof Error ? error.name : typeof error,
        },
        'Testing the saved Microsoft 365 connection failed',
      );
      reportUnexpectedError(error);
      return toMicrosoft365ConnectionTestResult(
        Microsoft365ConnectionTestOutcome.UNEXPECTED_ERROR,
      );
    }
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
