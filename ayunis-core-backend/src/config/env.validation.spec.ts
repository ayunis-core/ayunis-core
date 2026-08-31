import { validateEnv } from './env.validation';

function baseEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    NODE_ENV: 'development',
    JWT_SECRET: 'a-jwt-secret',
    COOKIE_SECRET: 'a-cookie-secret',
    ...overrides,
  };
}

function prodEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return baseEnv({
    NODE_ENV: 'production',
    COOKIE_SECURE: 'true',
    MINIO_ROOT_USER: 'minio-user',
    MINIO_ROOT_PASSWORD: 'minio-password',
    REDIS_PASSWORD: 'redis-password',
    ...overrides,
  });
}

function without(
  env: Record<string, string>,
  ...keys: string[]
): Record<string, string> {
  const result = { ...env };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

describe('validateEnv', () => {
  it('returns the config unchanged when valid', () => {
    const env = baseEnv({ PORT: '3000' });

    expect(validateEnv(env)).toBe(env);
  });

  it('ignores unrelated process env vars (PATH, HOME, ...)', () => {
    expect(() =>
      validateEnv(baseEnv({ PATH: '/usr/bin', HOME: '/root' })),
    ).not.toThrow();
  });

  describe('required secrets', () => {
    it('throws when JWT_SECRET is missing', () => {
      expect(() => validateEnv(without(baseEnv(), 'JWT_SECRET'))).toThrow(
        /JWT_SECRET/,
      );
    });

    it('throws when COOKIE_SECRET is missing', () => {
      expect(() => validateEnv(without(baseEnv(), 'COOKIE_SECRET'))).toThrow(
        /COOKIE_SECRET/,
      );
    });

    it('treats a blank secret as missing', () => {
      expect(() => validateEnv(baseEnv({ JWT_SECRET: '   ' }))).toThrow(
        /JWT_SECRET/,
      );
    });

    it('lists every problem in a single error', () => {
      const env = without(baseEnv(), 'JWT_SECRET', 'COOKIE_SECRET');

      expect(() => validateEnv(env)).toThrow(/JWT_SECRET/);
      expect(() => validateEnv(env)).toThrow(/COOKIE_SECRET/);
    });
  });

  describe('typed optional variables', () => {
    it('rejects a non-numeric integer var', () => {
      expect(() =>
        validateEnv(
          baseEnv({ URL_RETRIEVER_MAX_DOWNLOAD_BYTES: 'not-a-number' }),
        ),
      ).toThrow(/URL_RETRIEVER_MAX_DOWNLOAD_BYTES/);
    });

    it.each([
      ['AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS', '0'],
      ['AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS', '1.5'],
      ['AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS', '1e2'],
      ['AUTH_ACCOUNT_LOCKOUT_MAX_ATTEMPTS', '0x10'],
      ['AUTH_ACCOUNT_LOCKOUT_WINDOW_MINUTES', '0'],
      ['AUTH_ACCOUNT_LOCKOUT_WINDOW_MINUTES', 'not-a-number'],
    ])('rejects invalid %s values', (key, value) => {
      expect(() => validateEnv(baseEnv({ [key]: value }))).toThrow(key);
    });

    it('accepts a valid integer var', () => {
      expect(() =>
        validateEnv(baseEnv({ URL_RETRIEVER_MAX_DOWNLOAD_BYTES: '1048576' })),
      ).not.toThrow();
    });

    it('treats a blank optional var as unset', () => {
      expect(() =>
        validateEnv(baseEnv({ URL_RETRIEVER_TIMEOUT_MS: '' })),
      ).not.toThrow();
    });

    it('rejects an invalid enum value', () => {
      expect(() =>
        validateEnv(baseEnv({ INTERNET_SEARCH_PROVIDER: 'google' })),
      ).toThrow(/INTERNET_SEARCH_PROVIDER/);
    });

    it('rejects a non-boolean feature flag', () => {
      expect(() =>
        validateEnv(baseEnv({ FEATURE_SKILLS_ENABLED: 'yes' })),
      ).toThrow(/FEATURE_SKILLS_ENABLED/);
    });

    it('rejects a non-boolean webhook disable flag', () => {
      expect(() =>
        validateEnv(baseEnv({ DISABLE_ORG_EVENTS_WEBHOOKS: 'yes' })),
      ).toThrow(/DISABLE_ORG_EVENTS_WEBHOOKS/);
    });

    it('rejects a non-boolean mock inference flag', () => {
      expect(() => validateEnv(baseEnv({ MOCK_INFERENCE: '1' }))).toThrow(
        /MOCK_INFERENCE/,
      );
    });

    it('accepts a complete SSO OIDC relying-party configuration', () => {
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: 'https://sso.ayunis.de',
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'a'.repeat(64),
            SSO_OIDC_CALLBACK_URL:
              'https://core.ayunis.de/api/auth/sso/oidc/callback',
          }),
        ),
      ).not.toThrow();
    });

    it('rejects a non-positive SSO reauthentication window', () => {
      expect(() =>
        validateEnv(baseEnv({ SSO_REAUTH_MAX_AGE_SECONDS: '0' })),
      ).toThrow(/SSO_REAUTH_MAX_AGE_SECONDS/);
    });

    it('rejects an invalid SSO transaction encryption key', () => {
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: 'https://sso.ayunis.de',
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'too-short',
            SSO_OIDC_CALLBACK_URL:
              'https://core.ayunis.de/api/auth/sso/oidc/callback',
          }),
        ),
      ).toThrow(/SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY/);
    });

    it('rejects a partial SSO OIDC relying-party configuration', () => {
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: 'https://sso.ayunis.de',
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
          }),
        ),
      ).toThrow(/SSO_OIDC_CLIENT_SECRET/);
    });

    it('rejects a malformed SSO OIDC URL without reporting an HTTPS violation', () => {
      let message = '';
      try {
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: 'not-a-url',
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'a'.repeat(64),
            SSO_OIDC_CALLBACK_URL:
              'https://core.ayunis.de/api/auth/sso/oidc/callback',
          }),
        );
      } catch (error) {
        message = error instanceof Error ? error.message : '';
      }

      expect(message).toMatch(/SSO_OIDC_ISSUER.*URL/);
      expect(message).not.toContain(
        'SSO_OIDC_ISSUER must use HTTPS except for local development',
      );
    });

    it('accepts loopback HTTP for local SSO testing', () => {
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: 'http://localhost:8080',
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'a'.repeat(64),
            SSO_OIDC_CALLBACK_URL:
              'http://localhost:3000/api/auth/sso/oidc/callback',
          }),
        ),
      ).not.toThrow();
    });

    it('rejects insecure non-loopback SSO URLs', () => {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols -- invalid input under test
      const insecureIssuer = 'http://sso.ayunis.de';
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: insecureIssuer,
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'a'.repeat(64),
            SSO_OIDC_CALLBACK_URL:
              'https://core.ayunis.de/api/auth/sso/oidc/callback',
          }),
        ),
      ).toThrow(/SSO_OIDC_ISSUER must use HTTPS/);
    });

    it('rejects non-HTTP SSO URLs', () => {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols -- invalid input under test
      const nonHttpIssuer = 'ftp://sso.ayunis.de';
      expect(() =>
        validateEnv(
          baseEnv({
            SSO_OIDC_ISSUER: nonHttpIssuer,
            SSO_OIDC_CLIENT_ID: 'ayunis-core-client',
            SSO_OIDC_CLIENT_SECRET: 'client-secret',
            SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY: 'a'.repeat(64),
            SSO_OIDC_CALLBACK_URL:
              'https://core.ayunis.de/api/auth/sso/oidc/callback',
          }),
        ),
      ).toThrow(/SSO_OIDC_ISSUER must use HTTPS/);
    });
  });

  describe('production rules', () => {
    it('passes with a fully configured production env', () => {
      expect(() => validateEnv(prodEnv())).not.toThrow();
    });

    it('requires COOKIE_SECURE to be "true"', () => {
      expect(() => validateEnv(prodEnv({ COOKIE_SECURE: 'false' }))).toThrow(
        /COOKIE_SECURE/,
      );
    });

    it('requires MinIO credentials', () => {
      const env = without(prodEnv(), 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD');

      expect(() => validateEnv(env)).toThrow(/MINIO_ACCESS_KEY/);
      expect(() => validateEnv(env)).toThrow(/MINIO_SECRET_KEY/);
    });

    it('accepts MINIO_ACCESS_KEY / MINIO_SECRET_KEY as the credentials', () => {
      const env = without(prodEnv(), 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD');

      expect(() =>
        validateEnv({
          ...env,
          MINIO_ACCESS_KEY: 'access',
          MINIO_SECRET_KEY: 'secret',
        }),
      ).not.toThrow();
    });

    it('requires REDIS_PASSWORD', () => {
      const env = without(prodEnv(), 'REDIS_PASSWORD');

      expect(() => validateEnv(env)).toThrow(/REDIS_PASSWORD/);
    });

    it('does not apply production rules outside production', () => {
      expect(() =>
        validateEnv(baseEnv({ COOKIE_SECURE: 'false' })),
      ).not.toThrow();
    });
  });
});
