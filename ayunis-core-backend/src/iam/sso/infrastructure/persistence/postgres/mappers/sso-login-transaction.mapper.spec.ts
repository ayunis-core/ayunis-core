import { randomUUID } from 'crypto';
import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { SsoLoginTransactionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/sso-login-transaction.mapper';

describe('SsoLoginTransactionMapper', () => {
  it('round-trips the organization-pinned transaction', () => {
    const transaction = new SsoLoginTransaction({
      stateHash: 'a'.repeat(64),
      browserBindingHash: 'b'.repeat(64),
      postLoginPath: '/',
      encryptedCodeVerifier: 'encrypted-verifier',
      encryptedNonce: 'encrypted-nonce',
      orgId: randomUUID(),
      zitadelOrgId: '385820595704561666',
      purpose: SsoLoginPurpose.LINK,
      linkUserId: randomUUID(),
      expiresAt: new Date('2026-08-12T10:10:00.000Z'),
    });

    expect(
      SsoLoginTransactionMapper.toDomain(
        SsoLoginTransactionMapper.toRecord(transaction),
      ),
    ).toEqual(transaction);
  });
});
