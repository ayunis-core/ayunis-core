import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import { getMillisecondsFromJwtExpiry } from './jwt.util';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { Logger } from '@nestjs/common';

const logger = new Logger('CookieUtil');

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax' | 'strict';
  path: string;
  domain?: string;
}

interface CookieNames {
  accessTokenName: string;
  refreshTokenName: string;
}

function buildCookieOptions(configService: ConfigService): CookieOptions {
  const domain = configService.get<string>('auth.cookie.domain');
  const options: CookieOptions = {
    httpOnly: configService.get<boolean>('auth.cookie.httpOnly', true),
    secure: configService.get<boolean>('auth.cookie.secure', false),
    sameSite: configService.get<string>('auth.cookie.sameSite', 'lax') as
      | 'none'
      | 'lax'
      | 'strict',
    path: '/',
  };

  if (domain) {
    options.domain = domain;
  }

  return options;
}

function getCookieNames(configService: ConfigService): CookieNames {
  return {
    accessTokenName: configService.get<string>(
      'auth.cookie.accessTokenName',
      'access_token',
    ),
    refreshTokenName: configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    ),
  };
}

export function setCookies(
  response: Response,
  tokens: AuthTokens,
  configService: ConfigService,
  includeRefreshToken = false,
): void {
  const baseOptions = buildCookieOptions(configService);
  const { accessTokenName, refreshTokenName } = getCookieNames(configService);

  logger.debug('Setting cookies with options:', {
    accessTokenName,
    domain: baseOptions.domain ?? 'undefined (browser default)',
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    httpOnly: baseOptions.httpOnly,
    includeRefreshToken,
  });

  response.cookie(accessTokenName, tokens.access_token, {
    ...baseOptions,
    maxAge: getAccessTokenMaxAge(configService),
  });

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
  const baseOptions = buildCookieOptions(configService);
  const { accessTokenName, refreshTokenName } = getCookieNames(configService);

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
