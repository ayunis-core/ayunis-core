import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { UUID } from 'crypto';
import { OidcBrokerClient } from 'src/iam/sso/application/ports/oidc-broker.client';
import { SsoLoginTransactionEncryptionPort } from 'src/iam/sso/application/ports/sso-login-transaction-encryption.port';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';

const POST_LOGIN_PATH = '/';
const LOGIN_TRANSACTION_TTL_MS = 10 * 60 * 1000;

interface StartSsoAuthorizationTransaction {
  orgId: UUID;
  zitadelOrgId: string;
  purpose: SsoLoginPurpose;
  linkUserId: UUID | null;
}

export interface StartedSsoAuthorizationTransaction {
  authorizationUrl: string;
  browserBinding: string;
}

@Injectable()
export class SsoAuthorizationTransactionService {
  constructor(
    private readonly transactions: SsoLoginTransactionsRepository,
    private readonly broker: OidcBrokerClient,
    private readonly encryption: SsoLoginTransactionEncryptionPort,
  ) {}

  async start(
    input: StartSsoAuthorizationTransaction,
  ): Promise<StartedSsoAuthorizationTransaction> {
    const request = await this.broker.createAuthorizationRequest({
      zitadelOrgId: input.zitadelOrgId,
    });
    const browserBinding = randomBytes(32).toString('base64url');
    await this.transactions.save(
      new SsoLoginTransaction({
        stateHash: this.hash(request.state),
        browserBindingHash: this.hash(browserBinding),
        postLoginPath: POST_LOGIN_PATH,
        encryptedCodeVerifier: this.encryption.encrypt(request.codeVerifier),
        encryptedNonce: this.encryption.encrypt(request.nonce),
        orgId: input.orgId,
        zitadelOrgId: input.zitadelOrgId,
        purpose: input.purpose,
        linkUserId: input.linkUserId,
        expiresAt: new Date(Date.now() + LOGIN_TRANSACTION_TTL_MS),
      }),
    );
    return { authorizationUrl: request.authorizationUrl, browserBinding };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
