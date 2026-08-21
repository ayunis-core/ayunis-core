import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { RevokeSessionsByZitadelSessionUseCase } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.use-case';
import type { RevokeSsoSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.use-case';
import type { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import type { OidcBrokerLogoutClient } from 'src/iam/sso/application/ports/oidc-broker-logout.client';
import { aFederatedIdentity } from 'src/iam/sso/application/testing/sso-provisioning.fixtures';
import { HandleSsoBackchannelLogoutCommand } from 'src/iam/sso/application/use-cases/handle-sso-backchannel-logout/handle-sso-backchannel-logout.command';
import { HandleSsoBackchannelLogoutUseCase } from 'src/iam/sso/application/use-cases/handle-sso-backchannel-logout/handle-sso-backchannel-logout.use-case';

describe(HandleSsoBackchannelLogoutUseCase.name, () => {
  const broker = { validateBackchannelLogoutToken: jest.fn() };
  const identities = { findByIssuerAndSubject: jest.fn() };
  const revokeSession = { execute: jest.fn() };
  const revokeUserSso = { execute: jest.fn() };
  const useCase = new HandleSsoBackchannelLogoutUseCase(
    createPinoLoggerMock(),
    broker as unknown as OidcBrokerLogoutClient,
    identities as unknown as FederatedIdentitiesRepository,
    revokeSession as unknown as RevokeSessionsByZitadelSessionUseCase,
    revokeUserSso as unknown as RevokeSsoSessionsForUserUseCase,
  );

  beforeEach(() => jest.clearAllMocks());

  it('revokes the exact Core session identified by the signed sid', async () => {
    broker.validateBackchannelLogoutToken.mockResolvedValue({
      issuer: 'https://sso.ayunis.de',
      subject: 'zitadel-user',
      sessionId: 'zitadel-session',
    });

    await useCase.execute(new HandleSsoBackchannelLogoutCommand('signed'));

    expect(revokeSession.execute).toHaveBeenCalledWith(
      expect.objectContaining({ zitadelSessionId: 'zitadel-session' }),
    );
    expect(identities.findByIssuerAndSubject).not.toHaveBeenCalled();
  });

  it('falls back to all SSO sessions for the mapped subject when sid is absent', async () => {
    const identity = aFederatedIdentity();
    broker.validateBackchannelLogoutToken.mockResolvedValue({
      issuer: identity.issuer,
      subject: identity.subject,
    });
    identities.findByIssuerAndSubject.mockResolvedValue(identity);

    await useCase.execute(new HandleSsoBackchannelLogoutCommand('signed'));

    expect(revokeUserSso.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: identity.userId }),
    );
  });

  it('is idempotent for an unknown signed subject', async () => {
    broker.validateBackchannelLogoutToken.mockResolvedValue({
      issuer: 'https://sso.ayunis.de',
      subject: 'unknown-user',
    });
    identities.findByIssuerAndSubject.mockResolvedValue(null);

    await expect(
      useCase.execute(new HandleSsoBackchannelLogoutCommand('signed')),
    ).resolves.toBeUndefined();
    expect(revokeUserSso.execute).not.toHaveBeenCalled();
  });
});
