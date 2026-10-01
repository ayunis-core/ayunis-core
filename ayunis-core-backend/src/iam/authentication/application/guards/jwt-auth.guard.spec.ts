import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import {
  OrgAccessError,
  OrgRetrievalFailedError,
} from 'src/iam/orgs/application/orgs.errors';

interface GuardContext {
  context: ExecutionContext;
  request: Pick<Request, 'cookies'>;
  response: Pick<Response, 'cookie' | 'clearCookie'>;
}

function createContext(cookies: Record<string, string>): GuardContext {
  const request = { cookies } as Pick<Request, 'cookies'>;
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Pick<Response, 'cookie' | 'clearCookie'>;
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, request, response };
}

describe('JwtAuthGuard', () => {
  const parentGuard = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
    canActivate: (context: ExecutionContext) => Promise<boolean>;
  };
  let parentCanActivate: jest.SpyInstance;
  let refreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    parentCanActivate = jest
      .spyOn(parentGuard, 'canActivate')
      .mockRejectedValue(new UnauthorizedException());
    refreshTokenUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenUseCase>;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;
    guard = new JwtAuthGuard(reflector, refreshTokenUseCase, configService);
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
  });

  it('returns unauthorized when neither session cookie can authenticate', async () => {
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('clears an invalid refresh session and returns unauthorized', async () => {
    const { context, response } = createContext({
      refresh_token: 'expired-refresh-token',
    });
    refreshTokenUseCase.execute.mockRejectedValue(
      new InvalidTokenError('refresh token expired'),
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(response.clearCookie).toHaveBeenCalledTimes(3);
  });

  it('renews a valid refresh session and retries the request', async () => {
    const { context, request, response } = createContext({
      refresh_token: 'valid-refresh-token',
    });
    refreshTokenUseCase.execute.mockResolvedValue({
      access_token: 'renewed-access-token',
      refresh_token: 'rotated-refresh-token',
    });
    parentCanActivate
      .mockReset()
      .mockRejectedValueOnce(new UnauthorizedException())
      .mockResolvedValueOnce(true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.cookies.access_token).toBe('renewed-access-token');
    expect(response.cookie).toHaveBeenCalledTimes(2);
  });

  it('preserves the session when access validation fails unexpectedly', async () => {
    const lookupFailure = new OrgRetrievalFailedError('database unavailable');
    const { context, response } = createContext({
      refresh_token: 'valid-refresh-token',
    });
    parentCanActivate.mockRejectedValue(lookupFailure);

    await expect(guard.canActivate(context)).rejects.toBe(lookupFailure);
    expect(refreshTokenUseCase.execute).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('preserves the session when token refresh fails unexpectedly', async () => {
    const lookupFailure = new OrgRetrievalFailedError('database unavailable');
    const { context, response } = createContext({
      refresh_token: 'valid-refresh-token',
    });
    refreshTokenUseCase.execute.mockRejectedValue(lookupFailure);

    await expect(guard.canActivate(context)).rejects.toBe(lookupFailure);
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('clears an inactive organisation session', async () => {
    const { context, response } = createContext({
      refresh_token: 'revoked-refresh-token',
    });
    parentCanActivate.mockRejectedValue(new OrgAccessError());
    refreshTokenUseCase.execute.mockRejectedValue(new OrgAccessError());

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(response.clearCookie).toHaveBeenCalledTimes(3);
  });
});
