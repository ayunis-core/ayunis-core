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
});
