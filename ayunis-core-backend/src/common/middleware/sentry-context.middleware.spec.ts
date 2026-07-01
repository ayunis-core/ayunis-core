import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { SentryContextMiddleware } from './sentry-context.middleware';

jest.mock('@sentry/nestjs', () => {
  const setTag = jest.fn();
  const setExtra = jest.fn();
  return {
    getCurrentScope: jest.fn(() => ({ setTag, setExtra })),
  };
});

describe('SentryContextMiddleware', () => {
  let middleware: SentryContextMiddleware;
  let setExtra: jest.Mock;
  let next: jest.Mock;

  const getExtra = (name: string): unknown =>
    setExtra.mock.calls.find((call) => call[0] === name)?.[1];

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new SentryContextMiddleware();
    const scope = Sentry.getCurrentScope();
    setExtra = scope.setExtra as unknown as jest.Mock;
    next = jest.fn();
  });

  it('redacts sensitive keys in the request body', () => {
    const req = {
      path: '/auth/login',
      method: 'POST',
      body: { email: 'user@example.com', password: 'super-secret' },
      params: {},
      query: {},
    } as unknown as Request;

    middleware.use(req, {} as Response, next);

    expect(getExtra('requestBody')).toEqual({
      email: 'user@example.com',
      password: '[REDACTED]',
    });
    expect(next).toHaveBeenCalled();
  });

  it('redacts invite tokens passed as route params', () => {
    const req = {
      path: '/invites/token/abc',
      method: 'GET',
      body: {},
      params: { token: 'eyJhbGciOiJIUzI1NiJ9.invite-jwt.signature' },
      query: {},
    } as unknown as Request;

    middleware.use(req, {} as Response, next);

    expect(getExtra('requestParams')).toEqual({ token: '[REDACTED]' });
  });

  it('redacts tokens passed as query parameters', () => {
    const req = {
      path: '/reset-password',
      method: 'GET',
      body: {},
      params: {},
      query: { token: 'reset-token-value', page: '1' },
    } as unknown as Request;

    middleware.use(req, {} as Response, next);

    expect(getExtra('requestQuery')).toEqual({
      token: '[REDACTED]',
      page: '1',
    });
  });
});
