import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  OidcBrokerClient,
  type ValidatedOidcIdentity,
} from 'src/iam/sso/application/ports/oidc-broker.client';
import { SsoLoginTransactionEncryptionPort } from 'src/iam/sso/application/ports/sso-login-transaction-encryption.port';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoBrokerResponseError,
  InvalidSsoLoginTransactionError,
  SsoConnectionNotAvailableError,
  SsoOrganizationMismatchError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { CompleteOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.command';
import { emailDomainFromAddress } from 'src/iam/sso/domain/sso-connection-values';

export interface CompletedOrgSsoLogin extends ValidatedOidcIdentity {
  orgId: UUID;
  postLoginPath: string;
}

@Injectable()
export class CompleteOrgSsoLoginUseCase {
  private readonly logger = new Logger(CompleteOrgSsoLoginUseCase.name);

  constructor(
    private readonly transactions: SsoLoginTransactionsRepository,
    private readonly broker: OidcBrokerClient,
    private readonly encryption: SsoLoginTransactionEncryptionPort,
    private readonly connections: OrgSsoConnectionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: CompleteOrgSsoLoginCommand,
  ): Promise<CompletedOrgSsoLogin> {
    this.logger.log('Completing organization SSO login');
    const state = this.singleState(command.callbackParameters);
    const browserBindingHash = this.browserBindingHash(command.browserBinding);
    const transaction = await this.transactions.consume(
      createHash('sha256').update(state).digest('hex'),
      browserBindingHash,
      new Date(),
    );
    if (!transaction) {
      throw new InvalidSsoLoginTransactionError();
    }
    const connection = await this.connections.findByOrgId(transaction.orgId);
    if (
      !connection?.enabled ||
      connection.zitadelOrgId !== transaction.zitadelOrgId
    ) {
      throw new SsoConnectionNotAvailableError();
    }
    const identity = await this.broker.validateCallback({
      callbackParameters: command.callbackParameters,
      codeVerifier: this.encryption.decrypt(transaction.encryptedCodeVerifier),
      expectedState: state,
      expectedNonce: this.encryption.decrypt(transaction.encryptedNonce),
    });
    if (identity.zitadelOrgId !== transaction.zitadelOrgId) {
      throw new SsoOrganizationMismatchError();
    }
    if (!identity.emailVerified) {
      throw new InvalidSsoBrokerResponseError('email_verified');
    }
    const identityEmailDomain = emailDomainFromAddress(identity.email);
    if (!identityEmailDomain) {
      throw new InvalidSsoBrokerResponseError('email');
    }
    if (identityEmailDomain !== connection.emailDomain) {
      throw new SsoOrganizationMismatchError();
    }
    return {
      ...identity,
      orgId: transaction.orgId,
      postLoginPath: transaction.postLoginPath,
    };
  }

  private singleState(parameters: URLSearchParams): string {
    const values = parameters.getAll('state');
    if (values.length !== 1 || values[0].length === 0) {
      throw new InvalidSsoLoginTransactionError();
    }
    return values[0];
  }

  private browserBindingHash(binding: string | undefined): string {
    if (!binding) {
      throw new InvalidSsoLoginTransactionError();
    }
    return createHash('sha256').update(binding).digest('hex');
  }
}
