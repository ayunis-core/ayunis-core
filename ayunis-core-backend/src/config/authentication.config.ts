import { registerAs } from '@nestjs/config';

export enum AuthProvider {
  LOCAL = 'local',
  CLOUD = 'cloud',
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
  // JWT_SECRET / COOKIE_SECRET presence, and COOKIE_SECURE=true in production,
  // are enforced at boot by validateEnv (src/config/env.validation.ts) — the
  // single source of truth for env validity. Both secrets are guaranteed
  // present and non-empty here; there is no insecure default fallback.
  const jwtSecret = process.env.JWT_SECRET as string;
  const cookieSecret = process.env.COOKIE_SECRET as string;

  return {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- env var may be undefined at runtime despite type cast
    provider: (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,
    jwt: jwtConfig(jwtSecret),
    cookie: cookieConfig(cookieSecret),
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
    session: {
      // Reuse of a just-rotated refresh token within this window is treated as
      // a benign concurrent-request race rather than token theft.
      refreshTokenGraceSeconds: parseInt(
        process.env.SESSION_REFRESH_GRACE_SECONDS || '60',
        10,
      ),
    },
    emailProviderBlacklist,
  };
});
