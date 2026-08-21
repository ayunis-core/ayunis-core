import { createHash } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { StartOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.command';
import { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import { createMockOrgSsoConnectionsRepository } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  anEnabledSsoConnection,
  SSO_TEST_ORG_ID,
} from 'src/iam/sso/application/testing/sso-login.fixtures';

describe(StartOrgSsoLoginUseCase.name, () => {
  it('stores only hashed state and encrypted secrets before redirecting', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findByOrgId.mockResolvedValue(anEnabledSsoConnection());
    const transactions = {
      save: jest.fn().mockImplementation(async (transaction) => transaction),
      consume: jest.fn(),
      deleteExpired: jest.fn(),
    };
    const broker = {
      createAuthorizationRequest: jest.fn().mockResolvedValue({
        authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
        state: 'oauth-state',
        nonce: 'oidc-nonce',
        codeVerifier: 'pkce-verifier',
      }),
      validateCallback: jest.fn(),
    };
    const encryption = {
      encrypt: jest.fn((value: string) => `encrypted:${value}`),
      decrypt: jest.fn(),
    };
    const useCase = new StartOrgSsoLoginUseCase(
      createPinoLoggerMock(),
      repository,
      transactions,
      broker,
      encryption,
    );

    const result = await useCase.execute(
      new StartOrgSsoLoginCommand(SSO_TEST_ORG_ID),
    );
    expect(result).toEqual({
      authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
      browserBinding: expect.any(String),
    });
    expect(transactions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: SSO_TEST_ORG_ID,
        stateHash: createHash('sha256').update('oauth-state').digest('hex'),
        browserBindingHash: createHash('sha256')
          .update(result.browserBinding)
          .digest('hex'),
        postLoginPath: '/',
        encryptedCodeVerifier: 'encrypted:pkce-verifier',
        encryptedNonce: 'encrypted:oidc-nonce',
      }),
    );
    expect(JSON.stringify(transactions.save.mock.calls)).not.toContain(
      'oauth-state',
    );
    expect(JSON.stringify(transactions.save.mock.calls)).not.toContain(
      result.browserBinding,
    );
  });

  it.each([
    ['missing', null],
    ['disabled', anEnabledSsoConnection({ enabled: false })],
    ['unmapped', anEnabledSsoConnection({ zitadelOrgId: null })],
  ])('refuses a %s connection', async (_case, connection) => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findByOrgId.mockResolvedValue(connection);
    const useCase = new StartOrgSsoLoginUseCase(
      createPinoLoggerMock(),
      repository,
      {
        save: jest.fn(),
        consume: jest.fn(),
        deleteExpired: jest.fn(),
      },
      { createAuthorizationRequest: jest.fn(), validateCallback: jest.fn() },
      { encrypt: jest.fn(), decrypt: jest.fn() },
    );

    await expect(
      useCase.execute(new StartOrgSsoLoginCommand(SSO_TEST_ORG_ID)),
    ).rejects.toMatchObject({ code: 'SSO_CONNECTION_NOT_AVAILABLE' });
  });
});
