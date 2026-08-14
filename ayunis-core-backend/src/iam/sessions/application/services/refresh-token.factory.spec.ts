import { ConfigService } from '@nestjs/config';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import {
  TEST_FAMILY_ID,
  TEST_USER_ID,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('RefreshTokenFactory', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  let factory: RefreshTokenFactory;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    const config = new ConfigService({
      auth: { jwt: { refreshTokenExpiresIn: '7d' } },
      ssoOidc: { reauthenticationMaxAgeSeconds: 86_400 },
    });
    factory = new RefreshTokenFactory(config);
  });

  afterEach(() => jest.useRealTimers());

  it('caps a new SSO family at the reauthentication window', () => {
    const { token } = factory.create({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session',
    });

    expect(token.expiresAt).toEqual(new Date('2026-08-15T12:00:00.000Z'));
  });

  it('preserves an SSO family expiry across rotation', () => {
    const familyExpiresAt = new Date('2026-08-14T18:00:00.000Z');

    const { token } = factory.create({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session',
      familyExpiresAt,
    });

    expect(token.expiresAt).toEqual(familyExpiresAt);
  });

  it('keeps password session expiry on the existing sliding TTL', () => {
    const { token } = factory.create({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });

    expect(token.expiresAt).toEqual(new Date('2026-08-21T12:00:00.000Z'));
  });
});
