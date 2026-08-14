import type { Request, Response } from 'express';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { SSO_TEST_ORG_ID } from 'src/iam/sso/application/testing/sso-login.fixtures';
import type { CompleteSsoAuthenticationUseCase } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.use-case';
import type { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import type { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import type { StartSsoAccountLinkUseCase } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.use-case';
import { SsoLoginController } from 'src/iam/sso/presenters/http/sso-login.controller';

describe(SsoLoginController.name, () => {
  const discovery = { execute: jest.fn() };
  const start = { execute: jest.fn() };
  const completeAuthentication = { execute: jest.fn() };
  const startLink = { execute: jest.fn() };
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
    completeAuthentication as unknown as CompleteSsoAuthenticationUseCase,
    startLink as unknown as StartSsoAccountLinkUseCase,
    configService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    completeAuthentication.execute.mockResolvedValue({
      postLoginPath: '/',
      kind: 'authenticated',
      session: {
        status: 'authenticated',
        tokens: new AuthTokens('access', 'refresh'),
      },
    });
    const request = {
      originalUrl: '/api/auth/sso/oidc/callback?code=code&state=one&state=two',
      cookies: { ayunis_sso_login: 'browser-binding' },
    } as unknown as Request;

    await controller.callback(request, response);

    const command = completeAuthentication.execute.mock.calls[0][0];
    expect(command.callbackParameters.getAll('state')).toEqual(['one', 'two']);
    expect(command.browserBinding).toBe('browser-binding');
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh',
      expect.any(Object),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'ayunis_sso_login',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('sets only the MFA pending cookie when Core MFA is required', async () => {
    completeAuthentication.execute.mockResolvedValue({
      postLoginPath: '/',
      kind: 'authenticated',
      session: {
        status: 'mfa_required',
        mfaPendingToken: 'signed-pending-token',
        enrollmentRequired: false,
      },
    });
    const request = {
      originalUrl: '/api/auth/sso/oidc/callback?code=code&state=state',
      cookies: { ayunis_sso_login: 'browser-binding' },
    } as unknown as Request;

    await controller.callback(request, response);

    expect(response.cookie).toHaveBeenCalledTimes(1);
    expect(response.cookie).toHaveBeenCalledWith(
      'mfa_pending_token',
      'signed-pending-token',
      expect.any(Object),
    );
  });

  it('starts an authenticated account-link transaction without redirecting', async () => {
    startLink.execute.mockResolvedValue({
      authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
      browserBinding: 'link-browser-binding',
    });

    await expect(
      controller.startLink(
        'd19130fa-f2e6-4c92-84a9-62a651269104',
        SSO_TEST_ORG_ID,
        response,
      ),
    ).resolves.toEqual({
      authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'ayunis_sso_login',
      'link-browser-binding',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('does not issue session cookies after account linking', async () => {
    completeAuthentication.execute.mockResolvedValue({
      kind: 'linked',
      postLoginPath: '/',
    });
    const request = {
      originalUrl: '/api/auth/sso/oidc/callback?code=code&state=state',
      cookies: { ayunis_sso_login: 'browser-binding' },
    } as unknown as Request;

    await controller.callback(request, response);

    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalled();
  });

  it('keeps the correlation cookie when callback validation fails', async () => {
    completeAuthentication.execute.mockRejectedValue(
      new Error('invalid callback'),
    );
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
