import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import { getMillisecondsFromJwtExpiry } from './jwt.util';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { Logger } from '@nestjs/common';

const logger = new Logger('CookieUtil');

export function setCookies(
  response: Response,
  tokens: AuthTokens,
  configService: ConfigService,
  includeRefreshToken = false,
): void {
  const accessTokenName = configService.get<string>(
    'auth.cookie.accessTokenName',
    'access_token',
  );
  const refreshTokenName = configService.get<string>(
    'auth.cookie.refreshTokenName',
    'refresh_token',
  );
  const domain = configService.get<string>('auth.cookie.domain');
  const httpOnly = configService.get<boolean>('auth.cookie.httpOnly', true);
  const secure = configService.get<boolean>('auth.cookie.secure', false);
  const sameSite = configService.get<string>('auth.cookie.sameSite', 'lax');

  const baseOptions = {
    httpOnly,
    secure,
    sameSite: sameSite as 'none' | 'lax' | 'strict',
    path: '/', // Ensure cookies are available for all paths
    domain: undefined as string | undefined,
  };

  // Only include domain if it's explicitly set
  if (domain) {
    baseOptions.domain = domain;
  }

  logger.debug('Setting cookies with options:', {
    accessTokenName,
    domain: domain || 'undefined (browser default)',
    secure,
    sameSite,
    httpOnly,
    includeRefreshToken,
  });

  response.cookie(accessTokenName, tokens.access_token, {
    ...baseOptions,
    maxAge: getAccessTokenMaxAge(configService),
  });

  // Set refresh token if requested
  if (includeRefreshToken) {
    response.cookie(refreshTokenName, tokens.refresh_token, {
      ...baseOptions,
      maxAge: getRefreshTokenMaxAge(configService),
    });
  }
}

export function clearCookies(
  response: Response,
  configService: ConfigService,
): void {
  const accessTokenName = configService.get<string>(
    'auth.cookie.accessTokenName',
    'access_token',
  );
  const refreshTokenName = configService.get<string>(
    'auth.cookie.refreshTokenName',
    'refresh_token',
  );
  const domain = configService.get<string>('auth.cookie.domain');
  const httpOnly = configService.get<boolean>('auth.cookie.httpOnly', true);
  const secure = configService.get<boolean>('auth.cookie.secure', false);
  const sameSite = configService.get<string>('auth.cookie.sameSite', 'lax');

  const baseOptions = {
    httpOnly,
    secure,
    sameSite: sameSite as 'none' | 'lax' | 'strict',
    path: '/', // Ensure cookies are cleared from all paths
    domain: undefined as string | undefined,
  };

  // Only include domain if it's explicitly set
  if (domain) {
    baseOptions.domain = domain;
  }

  response.clearCookie(accessTokenName, baseOptions);
  response.clearCookie(refreshTokenName, baseOptions);
}

function getAccessTokenMaxAge(configService: ConfigService): number {
  const expiresIn = configService.get<string>('auth.jwt.expiresIn', '1h');
  return getMillisecondsFromJwtExpiry(expiresIn);
}

function getRefreshTokenMaxAge(configService: ConfigService): number {
  const expiresIn = configService.get<string>(
    'auth.jwt.refreshTokenExpiresIn',
    '7d',
  );
  return getMillisecondsFromJwtExpiry(expiresIn);
}
