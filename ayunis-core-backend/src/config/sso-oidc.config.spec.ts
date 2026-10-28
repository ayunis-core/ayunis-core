import { ssoOidcConfig } from 'src/config/sso-oidc.config';

describe('ssoOidcConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SSO_OIDC_ISSUER;
    delete process.env.SSO_OIDC_CLIENT_ID;
    delete process.env.SSO_OIDC_CLIENT_SECRET;
    delete process.env.SSO_OIDC_CALLBACK_URL;
    delete process.env.SSO_REAUTH_MAX_AGE_SECONDS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads the Zitadel relying-party configuration', () => {
    process.env.SSO_OIDC_ISSUER = 'https://sso.ayunis.de';
    process.env.SSO_OIDC_CLIENT_ID = 'ayunis-core-client';
    process.env.SSO_OIDC_CLIENT_SECRET = 'client-secret';
    process.env.SSO_OIDC_CALLBACK_URL =
      'https://core.ayunis.de/api/auth/sso/oidc/callback';

    expect(ssoOidcConfig()).toEqual({
      issuer: 'https://sso.ayunis.de',
      clientId: 'ayunis-core-client',
      clientSecret: 'client-secret',
      callbackUrl: 'https://core.ayunis.de/api/auth/sso/oidc/callback',
      allowInsecureRequests: false,
      reauthenticationMaxAgeSeconds: 86_400,
    });
  });

  it('keeps the additive SSO integration dormant when it is not configured', () => {
    expect(ssoOidcConfig()).toEqual({
      issuer: undefined,
      clientId: undefined,
      clientSecret: undefined,
      callbackUrl: undefined,
      allowInsecureRequests: false,
      reauthenticationMaxAgeSeconds: 86_400,
    });
  });

  it('allows an HTTP loopback broker only in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.SSO_OIDC_ISSUER = 'http://localhost:8080';

    expect(ssoOidcConfig().allowInsecureRequests).toBe(true);
  });

  it('reads a configured SSO reauthentication window', () => {
    process.env.SSO_REAUTH_MAX_AGE_SECONDS = '43200';

    expect(ssoOidcConfig().reauthenticationMaxAgeSeconds).toBe(43_200);
  });
});
