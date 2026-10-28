import { authenticationConfig } from './authentication.config';

// Requiredness of JWT_SECRET / COOKIE_SECRET and the production COOKIE_SECURE
// rule are enforced by validateEnv (see env.validation.spec.ts); this factory
// only reads values.
describe('authenticationConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'my-jwt-secret';
    process.env.COOKIE_SECRET = 'my-cookie-secret';
    delete process.env.COOKIE_SECURE;
    delete process.env.AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS;
    delete process.env.AUTH_ACCOUNT_LOCKOUT_WINDOW_MINUTES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads secrets from the environment', () => {
    const config = authenticationConfig();

    expect(config.jwt.secret).toBe('my-jwt-secret');
    expect(config.cookie.secret).toBe('my-cookie-secret');
  });

  it('sets cookie.secure to true when COOKIE_SECURE is "true"', () => {
    process.env.COOKIE_SECURE = 'true';

    expect(authenticationConfig().cookie.secure).toBe(true);
  });

  it('defaults cookie.secure to false when COOKIE_SECURE is unset', () => {
    expect(authenticationConfig().cookie.secure).toBe(false);
  });

  it('defaults account lockout to 10 failures within 15 minutes', () => {
    expect(authenticationConfig().accountLockout).toEqual({
      maxAttempts: 10,
      windowMinutes: 15,
    });
  });

  it('reads account lockout controls from the environment', () => {
    process.env.AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS = '6';
    process.env.AUTH_ACCOUNT_LOCKOUT_WINDOW_MINUTES = '20';

    expect(authenticationConfig().accountLockout).toEqual({
      maxAttempts: 6,
      windowMinutes: 20,
    });
  });
});
