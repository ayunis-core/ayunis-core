import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { StartAuthenticatedSessionUseCase } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import { CompleteSsoAuthenticationCommand } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.command';
import { CompleteSsoAuthenticationUseCase } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.use-case';
import type { ProvisionOrgSsoUserUseCase } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.use-case';
import type { LinkFederatedIdentityUseCase } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.use-case';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(CompleteSsoAuthenticationUseCase.name, () => {
  const completeLogin = { execute: jest.fn() };
  const provisionUser = { execute: jest.fn() };
  const startSession = { execute: jest.fn() };
  const linkIdentity = { execute: jest.fn() };
  const useCase = new CompleteSsoAuthenticationUseCase(
    createPinoLoggerMock(),
    completeLogin as unknown as CompleteOrgSsoLoginUseCase,
    provisionUser as unknown as ProvisionOrgSsoUserUseCase,
    startSession as unknown as StartAuthenticatedSessionUseCase,
    linkIdentity as unknown as LinkFederatedIdentityUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    completeLogin.execute.mockResolvedValue({
      postLoginPath: '/',
      sessionId: 'zitadel-session',
      authenticationMethods: ['pwd', 'otp', 'mfa'],
      purpose: SsoLoginPurpose.LOGIN,
      linkUserId: null,
    });
    provisionUser.execute.mockResolvedValue(
      new User({
        email: 'staff@demo.com',
        emailVerified: true,
        passwordHash: null,
        role: UserRole.USER,
        orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
        name: 'Erika Mustermann',
        hasAcceptedMarketing: false,
      }),
    );
    startSession.execute.mockResolvedValue({
      status: 'authenticated',
      tokens: new AuthTokens('access', 'refresh'),
    });
  });

  it('completes the broker flow and starts an MFA-satisfied SSO session', async () => {
    const callbackParameters = new URLSearchParams({ state: 'state' });

    await expect(
      useCase.execute(
        new CompleteSsoAuthenticationCommand(
          callbackParameters,
          'browser-binding',
        ),
      ),
    ).resolves.toMatchObject({
      postLoginPath: '/',
      kind: 'authenticated',
      session: { status: 'authenticated' },
    });
    expect(completeLogin.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackParameters,
        browserBinding: 'browser-binding',
      }),
    );
    expect(startSession.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationMethod: SessionAuthenticationMethod.SSO,
        zitadelSessionId: 'zitadel-session',
        brokerMfaSatisfied: true,
      }),
    );
  });

  it('links the broker identity without provisioning a user or issuing a session', async () => {
    completeLogin.execute.mockResolvedValue({
      issuer: 'https://sso.ayunis.de',
      subject: 'zitadel-user',
      email: 'staff@demo.com',
      emailVerified: true,
      name: 'Erika Mustermann',
      zitadelOrgId: '385820595704561666',
      authenticationMethods: ['pwd'],
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      postLoginPath: '/',
      purpose: SsoLoginPurpose.LINK,
      linkUserId: '1972fa3b-a4e9-4a1b-8b2c-10323d376b80',
    });

    await expect(
      useCase.execute(
        new CompleteSsoAuthenticationCommand(
          new URLSearchParams({ state: 'state' }),
          'browser-binding',
        ),
      ),
    ).resolves.toEqual({ kind: 'linked', postLoginPath: '/' });
    expect(linkIdentity.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '1972fa3b-a4e9-4a1b-8b2c-10323d376b80',
      }),
    );
    expect(provisionUser.execute).not.toHaveBeenCalled();
    expect(startSession.execute).not.toHaveBeenCalled();
  });

  it.each([
    { authenticationMethods: [] },
    { authenticationMethods: ['otp'] },
    { authenticationMethods: ['pwd', 'otp'] },
  ])(
    'requires Core to decide MFA for broker methods $authenticationMethods',
    async ({ authenticationMethods }) => {
      completeLogin.execute.mockResolvedValue({
        postLoginPath: '/',
        authenticationMethods,
        purpose: SsoLoginPurpose.LOGIN,
        linkUserId: null,
      });

      await useCase.execute(
        new CompleteSsoAuthenticationCommand(
          new URLSearchParams({ state: 'state' }),
          'browser-binding',
        ),
      );

      expect(startSession.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          zitadelSessionId: null,
          brokerMfaSatisfied: false,
        }),
      );
    },
  );
});
