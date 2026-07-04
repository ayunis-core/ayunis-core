import { registerAs } from '@nestjs/config';

export enum AuthProvider {
  LOCAL = 'local',
  CLOUD = 'cloud',
}

/**
 * Fail fast at boot when auth secrets are missing — in every environment.
 *
 * There is intentionally no fallback value for JWT_SECRET / COOKIE_SECRET:
 * a shared default would let anyone forge auth tokens/cookies. Requiring the
 * secrets everywhere (not just production) keeps one clear rule and matches
 * the consumers, which read the values with ConfigService.getOrThrow.
 * For local setups, copy .env.example and generate values with
 * `openssl rand -hex 32`.
 */
function assertSecretsConfigured(secrets: {
  jwtSecret?: string;
  cookieSecret?: string;
}): asserts secrets is { jwtSecret: string; cookieSecret: string } {
  const missing: string[] = [];
  if (!secrets.jwtSecret) {
    missing.push('JWT_SECRET');
  }
  if (!secrets.cookieSecret) {
    missing.push('COOKIE_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required secret(s): ${missing.join(', ')}. ` +
        'Set these environment variables to secure random values ' +
        '(e.g. `openssl rand -hex 32`) before starting the application.',
    );
  }
}

function jwtConfig(secret: string) {
  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    inviteExpiresIn: process.env.JWT_INVITE_EXPIRES_IN || '2d',
    emailConfirmationExpiresIn:
      process.env.JWT_EMAIL_CONFIRMATION_EXPIRES_IN || '24h',
    passwordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '2h',
    initialPasswordExpiresIn:
      process.env.JWT_INITIAL_PASSWORD_EXPIRES_IN || '7d',
    mfaPendingExpiresIn: process.env.JWT_MFA_PENDING_EXPIRES_IN || '5m',
  };
}

function cookieConfig(secret: string) {
  return {
    secret,
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    accessTokenName: 'access_token',
    refreshTokenName: 'refresh_token',
    mfaPendingTokenName: 'mfa_pending_token',
  };
}

const emailProviderBlacklist = [
  'gmail',
  'googlemail',
  'yahoo',
  'hotmail',
  'outlook',
  'icloud',
  'aol',
  'protonmail',
  'tutanota',
  'yandex',
  'zoho',
  'fastmail',
  'gmx',
  'mail',
  'inbox',
  't-online',
  'web',
  'gmx',
  'mail',
  'me',
];

export const authenticationConfig = registerAs('auth', () => {
  const secrets = {
    jwtSecret: process.env.JWT_SECRET,
    cookieSecret: process.env.COOKIE_SECRET,
  };

  assertSecretsConfigured(secrets);

  return {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- env var may be undefined at runtime despite type cast
    provider: (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    jwt: jwtConfig(secrets.jwtSecret),
    cookie: cookieConfig(secrets.cookieSecret),
    cloud: {
      apiUrl: process.env.CLOUD_AUTH_API_URL,
      apiKey: process.env.CLOUD_AUTH_API_KEY,
    },
    local: {
      passwordHashRounds: parseInt(
        process.env.PASSWORD_HASH_ROUNDS || '10',
        10,
      ),
    },
    emailProviderBlacklist,
  };
});
