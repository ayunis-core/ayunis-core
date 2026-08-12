import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OidcBrokerClient } from 'src/iam/sso/application/ports/oidc-broker.client';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { SsoLoginTransactionEncryptionPort } from 'src/iam/sso/application/ports/sso-login-transaction-encryption.port';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';
import {
  SsoConnectionNotAvailableError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { StartOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.command';
import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';

const POST_LOGIN_PATH = '/';
const LOGIN_TRANSACTION_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class StartOrgSsoLoginUseCase {
  private readonly logger = new Logger(StartOrgSsoLoginUseCase.name);

  constructor(
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly transactions: SsoLoginTransactionsRepository,
    private readonly broker: OidcBrokerClient,
    private readonly encryption: SsoLoginTransactionEncryptionPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: StartOrgSsoLoginCommand,
  ): Promise<{ authorizationUrl: string; browserBinding: string }> {
    this.logger.log('Starting organization SSO login', {
      orgId: command.orgId,
    });
    const connection = await this.connections.findByOrgId(command.orgId);
    if (!connection?.enabled || !connection.zitadelOrgId) {
      throw new SsoConnectionNotAvailableError();
    }
    const request = await this.broker.createAuthorizationRequest({
      zitadelOrgId: connection.zitadelOrgId,
    });
    const browserBinding = randomBytes(32).toString('base64url');
    await this.transactions.save(
      new SsoLoginTransaction({
        stateHash: createHash('sha256').update(request.state).digest('hex'),
        browserBindingHash: createHash('sha256')
          .update(browserBinding)
          .digest('hex'),
        postLoginPath: POST_LOGIN_PATH,
        encryptedCodeVerifier: this.encryption.encrypt(request.codeVerifier),
        encryptedNonce: this.encryption.encrypt(request.nonce),
        orgId: connection.orgId,
        zitadelOrgId: connection.zitadelOrgId,
        expiresAt: new Date(Date.now() + LOGIN_TRANSACTION_TTL_MS),
      }),
    );
    return { authorizationUrl: request.authorizationUrl, browserBinding };
  }
}
