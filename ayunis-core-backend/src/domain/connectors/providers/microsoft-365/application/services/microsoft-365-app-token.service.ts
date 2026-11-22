import { Injectable } from '@nestjs/common';
import { ConnectorNotSetUpError } from 'src/domain/connectors/application/connectors.errors';
import { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';
import {
  type EntraAppToken,
  EntraAppTokenPort,
  type EntraResource,
} from 'src/domain/connectors/providers/microsoft-365/application/ports/entra-app-token.port';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import {
  readMicrosoft365Credentials,
  readMicrosoft365Setup,
} from 'src/domain/connectors/providers/microsoft-365/domain/microsoft-365-connection';

/** App-only tokens for a Microsoft 365 connector, from its stored credentials. */
@Injectable()
export class Microsoft365AppTokenService {
  constructor(
    private readonly credentialEncryption: ConnectorCredentialEncryptionPort,
    private readonly entraAppToken: EntraAppTokenPort,
  ) {}

  /** Throws `ConnectorNotSetUpError` while the connector has no credentials. */
  async requestToken(
    connector: Connector,
    resource: EntraResource,
  ): Promise<EntraAppToken> {
    const setup = readMicrosoft365Setup(connector.setup);
    if (!setup || connector.encryptedCredentials === null) {
      throw new ConnectorNotSetUpError(connector.product);
    }
    const { clientSecret } = readMicrosoft365Credentials(
      await this.credentialEncryption.decrypt(connector.encryptedCredentials),
    );
    return this.entraAppToken.requestToken(
      { ...setup, clientSecret },
      resource,
    );
  }
}
