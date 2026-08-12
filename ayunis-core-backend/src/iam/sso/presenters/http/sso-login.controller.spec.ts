import type { Request, Response } from 'express';
import { SSO_TEST_ORG_ID } from 'src/iam/sso/application/testing/sso-login.fixtures';
import type { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import type { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import type { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import { SsoLoginController } from 'src/iam/sso/presenters/http/sso-login.controller';

describe(SsoLoginController.name, () => {
  const discovery = { execute: jest.fn() };
  const start = { execute: jest.fn() };
  const complete = { execute: jest.fn() };
  const configService = {
    get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
  };
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;
  const controller = new SsoLoginController(
    discovery as unknown as DiscoverOrgSsoUseCase,
    start as unknown as StartOrgSsoLoginUseCase,
    complete as unknown as CompleteOrgSsoLoginUseCase,
    configService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns only the organization routing result for email discovery', async () => {
    discovery.execute.mockResolvedValue({
      available: true,
      orgId: SSO_TEST_ORG_ID,
    });

    await expect(
      controller.discover({ email: 'staff@demo.com' }),
    ).resolves.toEqual({ available: true, orgId: SSO_TEST_ORG_ID });
  });

  it('redirects the browser to the broker authorization URL', async () => {
    start.execute.mockResolvedValue({
      authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
      browserBinding: 'browser-binding',
    });

    await expect(controller.start(SSO_TEST_ORG_ID, response)).resolves.toEqual({
      url: 'https://sso.ayunis.de/oauth/v2/authorize',
      statusCode: 302,
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'ayunis_sso_login',
      'browser-binding',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60 * 1000,
      }),
    );
  });

  it('marks the authorize redirect uncacheable so the transaction is never reused', async () => {
    start.execute.mockResolvedValue({
      authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
      browserBinding: 'browser-binding',
    });

    await controller.start(SSO_TEST_ORG_ID, response);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
  });

  it('preserves duplicate callback parameters for strict state validation', async () => {
    complete.execute.mockResolvedValue({});
    const request = {
      originalUrl: '/api/auth/sso/oidc/callback?code=code&state=one&state=two',
      cookies: { ayunis_sso_login: 'browser-binding' },
    } as unknown as Request;

    await controller.callback(request, response);

    const command = complete.execute.mock.calls[0][0];
    expect(command.callbackParameters.getAll('state')).toEqual(['one', 'two']);
    expect(command.browserBinding).toBe('browser-binding');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'ayunis_sso_login',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('keeps the correlation cookie when callback validation fails', async () => {
    complete.execute.mockRejectedValue(new Error('invalid callback'));
    const request = {
      originalUrl: '/api/auth/sso/oidc/callback?state=invalid',
      cookies: { ayunis_sso_login: 'browser-binding' },
    } as unknown as Request;

    await expect(controller.callback(request, response)).rejects.toThrow(
      'invalid callback',
    );
    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});
