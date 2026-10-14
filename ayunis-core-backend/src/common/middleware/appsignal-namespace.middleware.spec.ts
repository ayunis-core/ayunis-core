import { setNamespace } from '@appsignal/nodejs';
import type { Request, Response } from 'express';
import {
  AppsignalNamespaceMiddleware,
  appsignalNamespaceFor,
} from './appsignal-namespace.middleware';

jest.mock('@appsignal/nodejs', () => ({ setNamespace: jest.fn() }));

describe('appsignalNamespaceFor', () => {
  it.each([
    ['/api/super-admin/orgs', 'admin'],
    ['/api/super-admin', 'admin'],
    ['/api/super-admin/orgs?paying=true', 'admin'],
    ['/api/openai-compat/v1/chat/completions', 'api'],
    ['/api/openai-compat', 'api'],
  ])('maps %s to %s', (url, namespace) => {
    expect(appsignalNamespaceFor(url)).toBe(namespace);
  });

  it.each([
    '/api/threads',
    '/api/super-administrators',
    '/api/openai-compatible',
    '/super-admin/orgs',
    '/api/usage?from=/api/super-admin',
    '/',
  ])('leaves %s in the default namespace', (url) => {
    expect(appsignalNamespaceFor(url)).toBeUndefined();
  });
});

describe('AppsignalNamespaceMiddleware', () => {
  const middleware = new AppsignalNamespaceMiddleware();
  const res = {} as Response;

  beforeEach(() => jest.mocked(setNamespace).mockClear());

  it('sets the namespace for a mapped route and continues', () => {
    const next = jest.fn();

    middleware.use(
      { originalUrl: '/api/super-admin/orgs' } as Request,
      res,
      next,
    );

    expect(setNamespace).toHaveBeenCalledWith('admin');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves unmapped routes untouched and continues', () => {
    const next = jest.fn();

    middleware.use({ originalUrl: '/api/threads' } as Request, res, next);

    expect(setNamespace).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
