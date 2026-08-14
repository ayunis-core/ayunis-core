import type { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import { CompleteSsoLogoutCommand } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.command';
import { CompleteSsoLogoutUseCase } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.use-case';

describe(CompleteSsoLogoutUseCase.name, () => {
  const revokeSession = { execute: jest.fn() };
  const broker = { createEndSessionUrl: jest.fn() };
  const useCase = new CompleteSsoLogoutUseCase(
    revokeSession as unknown as RevokeSessionFamilyUseCase,
    broker as unknown as OidcBrokerLogoutClient,
  );

  beforeEach(() => jest.clearAllMocks());

  it('revokes Core first and returns the broker logout URL for an SSO session', async () => {
    revokeSession.execute.mockResolvedValue({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session',
    });
    broker.createEndSessionUrl.mockReturnValue(
      'https://sso.ayunis.de/oidc/v1/end_session',
    );

    await expect(
      useCase.execute(new CompleteSsoLogoutCommand('refresh-token')),
    ).resolves.toEqual({
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    expect(revokeSession.execute).toHaveBeenCalled();
    expect(broker.createEndSessionUrl).toHaveBeenCalled();
  });

  it.each([
    {
      case: 'password session',
      refreshToken: 'refresh-token',
      context: {
        authenticationMethod: SessionAuthenticationMethod.PASSWORD,
        zitadelSessionId: null,
      },
    },
    { case: 'unknown session', refreshToken: 'unknown', context: null },
    { case: 'missing cookie', refreshToken: undefined, context: null },
  ])(
    'finishes Core-only logout for a $case',
    async ({ refreshToken, context }) => {
      revokeSession.execute.mockResolvedValue(context);

      await expect(
        useCase.execute(new CompleteSsoLogoutCommand(refreshToken)),
      ).resolves.toEqual({ brokerLogoutUrl: null });
      expect(broker.createEndSessionUrl).not.toHaveBeenCalled();
    },
  );
});
