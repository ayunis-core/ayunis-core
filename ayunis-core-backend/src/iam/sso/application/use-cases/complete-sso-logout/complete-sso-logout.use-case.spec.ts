import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import { CompleteSsoLogoutCommand } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.command';
import { CompleteSsoLogoutUseCase } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.use-case';
import type { SsoBrokerSessionService } from 'src/iam/sso/application/services/sso-broker-session.service';

describe(CompleteSsoLogoutUseCase.name, () => {
  const logger = createPinoLoggerMock();
  const revokeSession = { execute: jest.fn() };
  const broker = { createEndSessionUrl: jest.fn() };
  const brokerSessions = { idTokenFor: jest.fn() };
  const useCase = new CompleteSsoLogoutUseCase(
    logger,
    revokeSession as unknown as RevokeSessionFamilyUseCase,
    broker as unknown as OidcBrokerLogoutClient,
    brokerSessions as unknown as SsoBrokerSessionService,
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
    brokerSessions.idTokenFor.mockResolvedValue('signed-id-token');

    await expect(
      useCase.execute(new CompleteSsoLogoutCommand('refresh-token')),
    ).resolves.toEqual({
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    expect(revokeSession.execute).toHaveBeenCalled();
    expect(brokerSessions.idTokenFor).toHaveBeenCalledWith('zitadel-session');
    expect(broker.createEndSessionUrl).toHaveBeenCalledWith('signed-id-token');
  });

  it('keeps the broker UI fallback for an existing SSO session without a stored hint', async () => {
    revokeSession.execute.mockResolvedValue({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'legacy-session',
    });
    brokerSessions.idTokenFor.mockResolvedValue(undefined);
    broker.createEndSessionUrl.mockReturnValue(
      'https://sso.ayunis.de/oidc/v1/end_session',
    );

    await expect(
      useCase.execute(new CompleteSsoLogoutCommand('refresh-token')),
    ).resolves.toEqual({
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    expect(broker.createEndSessionUrl).toHaveBeenCalledWith(undefined);
  });

  it('still completes logout when the stored hint cannot be read', async () => {
    revokeSession.execute.mockResolvedValue({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session',
    });
    brokerSessions.idTokenFor.mockRejectedValue(new Error('decrypt failed'));
    broker.createEndSessionUrl.mockReturnValue(
      'https://sso.ayunis.de/oidc/v1/end_session',
    );

    await expect(
      useCase.execute(new CompleteSsoLogoutCommand('refresh-token')),
    ).resolves.toEqual({
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    expect(broker.createEndSessionUrl).toHaveBeenCalledWith(undefined);
    expect(logger.warn).toHaveBeenCalledWith(
      { failureType: 'Error' },
      'Stored broker logout hint unavailable; using interactive fallback',
    );
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
