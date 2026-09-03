import { createHash } from 'crypto';
import { CompleteOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.command';
import { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import {
  anEnabledSsoConnection,
  SSO_TEST_ORG_ID,
  SSO_TEST_ZITADEL_ORG_ID,
} from 'src/iam/sso/application/testing/sso-login.fixtures';

const TEST_STATE = 'oauth-state';
const TEST_BROWSER_BINDING = 'browser-binding';

describe(CompleteOrgSsoLoginUseCase.name, () => {
  const callbackParameters = new URLSearchParams({
    code: 'authorization-code',
    state: TEST_STATE,
  });

  it('returns a validated identity when the callback matches the pinned organizations', async () => {
    const transaction = pendingTransaction();
    const transactions = {
      save: jest.fn(),
      consume: jest.fn().mockResolvedValue(transaction),
      deleteExpired: jest.fn(),
    };
    const broker = {
      createAuthorizationRequest: jest.fn(),
      validateCallback: jest.fn().mockResolvedValue({
        identity: {
          issuer: 'https://sso.ayunis.de',
          subject: 'zitadel-user',
          email: 'staff@demo.com',
          name: 'Erika Mustermann',
          emailVerified: true,
          zitadelOrgId: SSO_TEST_ZITADEL_ORG_ID,
        },
        idToken: 'signed-id-token',
      }),
    };
    const useCase = new CompleteOrgSsoLoginUseCase(
      transactions,
      broker,
      {
        encrypt: jest.fn(),
        decrypt: jest
          .fn()
          .mockReturnValueOnce('pkce-verifier')
          .mockReturnValueOnce('oidc-nonce'),
      },
      connectionRepository(),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).resolves.toMatchObject({
      identity: {
        orgId: SSO_TEST_ORG_ID,
        subject: 'zitadel-user',
        zitadelOrgId: SSO_TEST_ZITADEL_ORG_ID,
      },
      idToken: 'signed-id-token',
      postLoginPath: '/',
      purpose: SsoLoginPurpose.LOGIN,
      linkUserId: null,
    });
    expect(transactions.consume).toHaveBeenCalledWith(
      createHash('sha256').update(TEST_STATE).digest('hex'),
      createHash('sha256').update(TEST_BROWSER_BINDING).digest('hex'),
      expect.any(Date),
    );
  });

  it('returns the authenticated user binding for an account-link transaction', async () => {
    const linkUserId = '6a3b4623-269b-46a1-8ced-8b80586105e4' as const;
    const useCase = useCaseWithIdentity(
      {},
      anEnabledSsoConnection(),
      pendingTransaction({ purpose: SsoLoginPurpose.LINK, linkUserId }),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).resolves.toMatchObject({
      purpose: SsoLoginPurpose.LINK,
      linkUserId,
    });
  });

  it('rejects a callback without a single state value', async () => {
    const useCase = new CompleteOrgSsoLoginUseCase(
      {
        save: jest.fn(),
        consume: jest.fn(),
        deleteExpired: jest.fn(),
      },
      { createAuthorizationRequest: jest.fn(), validateCallback: jest.fn() },
      { encrypt: jest.fn(), decrypt: jest.fn() },
      connectionRepository(),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          new URLSearchParams('code=authorization-code'),
          TEST_BROWSER_BINDING,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SSO_LOGIN_TRANSACTION_INVALID' });
  });

  it('rejects a replayed or expired transaction', async () => {
    const useCase = new CompleteOrgSsoLoginUseCase(
      {
        save: jest.fn(),
        consume: jest.fn().mockResolvedValue(null),
        deleteExpired: jest.fn(),
      },
      { createAuthorizationRequest: jest.fn(), validateCallback: jest.fn() },
      { encrypt: jest.fn(), decrypt: jest.fn() },
      connectionRepository(),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SSO_LOGIN_TRANSACTION_INVALID' });
  });

  it('rejects a broker organization that differs from the pinned organization', async () => {
    const broker = {
      createAuthorizationRequest: jest.fn(),
      validateCallback: jest.fn().mockResolvedValue({
        identity: {
          issuer: 'https://sso.ayunis.de',
          subject: 'zitadel-user',
          email: 'staff@other.example',
          emailVerified: true,
          zitadelOrgId: 'different-zitadel-org',
        },
        idToken: 'signed-id-token',
      }),
    };
    const useCase = new CompleteOrgSsoLoginUseCase(
      {
        save: jest.fn(),
        consume: jest.fn().mockResolvedValue(pendingTransaction()),
        deleteExpired: jest.fn(),
      },
      broker,
      {
        encrypt: jest.fn(),
        decrypt: jest
          .fn()
          .mockReturnValueOnce('pkce-verifier')
          .mockReturnValueOnce('oidc-nonce'),
      },
      connectionRepository(),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SSO_ORGANIZATION_MISMATCH' });
  });

  it('rejects an unverified broker email', async () => {
    const useCase = useCaseWithIdentity({ emailVerified: false });

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).rejects.toMatchObject({
      code: 'SSO_BROKER_RESPONSE_INVALID',
      metadata: { field: 'email_verified' },
    });
  });

  it('rejects a verified broker email outside the configured domain', async () => {
    const useCase = useCaseWithIdentity({
      email: 'staff@other.example',
    });

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SSO_ORGANIZATION_MISMATCH' });
  });

  it('accepts a verified broker email from any configured domain', async () => {
    const verifiedAt = new Date('2026-08-27T12:00:00.000Z');
    const connection = anEnabledSsoConnection({
      emailDomains: [
        { emailDomain: 'demo.com', verifiedAt },
        { emailDomain: 'vhs.bremerhaven.de', verifiedAt },
      ],
    });
    const useCase = useCaseWithIdentity(
      { email: 'staff@vhs.bremerhaven.de' },
      connection,
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(
          callbackParameters,
          TEST_BROWSER_BINDING,
        ),
      ),
    ).resolves.toMatchObject({
      identity: { email: 'staff@vhs.bremerhaven.de' },
    });
  });

  it.each([
    ['disabled', anEnabledSsoConnection({ enabled: false })],
    [
      'remapped',
      anEnabledSsoConnection({ zitadelOrgId: '385820595704561999' }),
    ],
  ])(
    'rejects a callback when the connection was %s',
    async (_case, mapping) => {
      const useCase = useCaseWithIdentity({}, mapping);

      await expect(
        useCase.execute(
          new CompleteOrgSsoLoginCommand(
            callbackParameters,
            TEST_BROWSER_BINDING,
          ),
        ),
      ).rejects.toMatchObject({ code: 'SSO_CONNECTION_NOT_AVAILABLE' });
    },
  );

  it('rejects a callback from a different browser before broker exchange', async () => {
    const broker = {
      createAuthorizationRequest: jest.fn(),
      validateCallback: jest.fn(),
    };
    const useCase = new CompleteOrgSsoLoginUseCase(
      {
        save: jest.fn(),
        consume: jest.fn().mockResolvedValue(null),
        deleteExpired: jest.fn(),
      },
      broker,
      { encrypt: jest.fn(), decrypt: jest.fn() },
      connectionRepository(),
    );

    await expect(
      useCase.execute(
        new CompleteOrgSsoLoginCommand(callbackParameters, 'other-browser'),
      ),
    ).rejects.toMatchObject({ code: 'SSO_LOGIN_TRANSACTION_INVALID' });
    expect(broker.validateCallback).not.toHaveBeenCalled();
  });
});

function pendingTransaction(
  overrides: Partial<ConstructorParameters<typeof SsoLoginTransaction>[0]> = {},
): SsoLoginTransaction {
  return new SsoLoginTransaction({
    stateHash: createHash('sha256').update(TEST_STATE).digest('hex'),
    browserBindingHash: createHash('sha256')
      .update(TEST_BROWSER_BINDING)
      .digest('hex'),
    postLoginPath: '/',
    encryptedCodeVerifier: 'encrypted-verifier',
    encryptedNonce: 'encrypted-nonce',
    orgId: SSO_TEST_ORG_ID,
    zitadelOrgId: SSO_TEST_ZITADEL_ORG_ID,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ...overrides,
  });
}

function connectionRepository(connection = anEnabledSsoConnection()) {
  return {
    findByOrgId: jest.fn().mockResolvedValue(connection),
    findByOrgIdWithDomainState: jest.fn(),
    findByEmailDomain: jest.fn(),
    findOwnerOrgIdsByEmailDomains: jest.fn(),
    save: jest.fn(),
    updateConfigurationIfDisabled: jest.fn(),
    setEnabled: jest.fn(),
    setJitProvisioningEnabledIfMappingMatches: jest.fn(),
    setZitadelIdpIdIfMappingMatches: jest.fn(),
  };
}

function useCaseWithIdentity(
  identityOverrides: Record<string, unknown>,
  connection = anEnabledSsoConnection(),
  transaction = pendingTransaction(),
): CompleteOrgSsoLoginUseCase {
  return new CompleteOrgSsoLoginUseCase(
    {
      save: jest.fn(),
      consume: jest.fn().mockResolvedValue(transaction),
      deleteExpired: jest.fn(),
    },
    {
      createAuthorizationRequest: jest.fn(),
      validateCallback: jest.fn().mockResolvedValue({
        identity: {
          issuer: 'https://sso.ayunis.de',
          subject: 'zitadel-user',
          email: 'staff@demo.com',
          name: 'Erika Mustermann',
          emailVerified: true,
          zitadelOrgId: SSO_TEST_ZITADEL_ORG_ID,
          ...identityOverrides,
        },
        idToken: 'signed-id-token',
      }),
    },
    {
      encrypt: jest.fn(),
      decrypt: jest
        .fn()
        .mockReturnValueOnce('pkce-verifier')
        .mockReturnValueOnce('oidc-nonce'),
    },
    connectionRepository(connection),
  );
}
