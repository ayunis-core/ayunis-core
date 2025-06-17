import { registerAs } from '@nestjs/config';

export enum AuthProvider {
  LOCAL = 'local',
  CLOUD = 'cloud',
}

export const authenticationConfig = registerAs('auth', () => ({
  provider: (process.env.AUTH_PROVIDER as AuthProvider) || AuthProvider.LOCAL,

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    inviteExpiresIn: process.env.JWT_INVITE_EXPIRES_IN || '2d',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-secret-change-in-production',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    accessTokenName: 'access_token',
    refreshTokenName: 'refresh_token',
  },

  cloud: {
    apiUrl: process.env.CLOUD_AUTH_API_URL,
    apiKey: process.env.CLOUD_AUTH_API_KEY,
  },

  local: {
    passwordHashRounds: parseInt(process.env.PASSWORD_HASH_ROUNDS || '10', 10),
  },
}));
