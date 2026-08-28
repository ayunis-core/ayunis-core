import { ConfigService } from '@nestjs/config';
import { SsoBrokerSessionService } from 'src/iam/sso/application/services/sso-broker-session.service';
import { SSO_TEST_USER_ID } from 'src/iam/sso/application/testing/sso-provisioning.fixtures';

describe(SsoBrokerSessionService.name, () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  const sessions = {
    upsert: jest.fn(),
    findActiveByZitadelSessionId: jest.fn(),
    deleteExpired: jest.fn(),
  };
  const encryption = {
    encrypt: jest.fn().mockReturnValue('encrypted-id-token'),
    decrypt: jest.fn().mockReturnValue('signed-id-token'),
  };
  const service = new SsoBrokerSessionService(
    sessions,
    encryption,
    new ConfigService({
      ssoOidc: { reauthenticationMaxAgeSeconds: 86_400 },
      auth: { jwt: { mfaPendingExpiresIn: '5m' } },
    }),
  );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  it('stores the ID-token hint encrypted for the broker session lifetime', async () => {
    await service.store(SSO_TEST_USER_ID, 'zitadel-session', 'signed-id-token');

    expect(encryption.encrypt).toHaveBeenCalledWith('signed-id-token');
    expect(sessions.upsert).toHaveBeenCalledWith({
      userId: SSO_TEST_USER_ID,
      zitadelSessionId: 'zitadel-session',
      encryptedIdToken: 'encrypted-id-token',
      expiresAt: new Date('2026-08-29T12:05:00.000Z'),
    });
  });

  it('returns the decrypted hint for an active broker session', async () => {
    sessions.findActiveByZitadelSessionId.mockResolvedValue({
      userId: SSO_TEST_USER_ID,
      zitadelSessionId: 'zitadel-session',
      encryptedIdToken: 'encrypted-id-token',
      expiresAt: new Date('2026-08-29T12:00:00.000Z'),
    });

    await expect(service.idTokenFor('zitadel-session')).resolves.toBe(
      'signed-id-token',
    );
    expect(sessions.findActiveByZitadelSessionId).toHaveBeenCalledWith(
      'zitadel-session',
      now,
    );
  });

  it('returns no hint when the session has no stored context', async () => {
    sessions.findActiveByZitadelSessionId.mockResolvedValue(null);

    await expect(service.idTokenFor('legacy-session')).resolves.toBeUndefined();
    expect(encryption.decrypt).not.toHaveBeenCalled();
  });
});
