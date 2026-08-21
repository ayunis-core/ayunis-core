import * as oidc from 'openid-client';
import { ZitadelOidcBrokerClient } from 'src/iam/sso/infrastructure/oidc/zitadel-oidc-broker.client';
import { SsoBrokerNotConfiguredError } from 'src/iam/sso/application/sso.errors';
import { ProviderConnectionError } from 'src/common/errors/provider.errors';

jest.mock('openid-client', () => ({
  allowInsecureRequests: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  AuthorizationResponseError: class AuthorizationResponseError extends Error {},
  buildAuthorizationUrl: jest.fn(),
  calculatePKCECodeChallenge: jest.fn(),
  ClientSecretBasic: jest.fn().mockReturnValue('basic-client-auth'),
  discovery: jest.fn(),
  fetchUserInfo: jest.fn(),
  ClientError: class ClientError extends Error {},
  ResponseBodyError: class ResponseBodyError extends Error {},
  randomNonce: jest.fn(),
  randomPKCECodeVerifier: jest.fn(),
  randomState: jest.fn(),
  WWWAuthenticateChallengeError: class WWWAuthenticateChallengeError extends Error {},
}));

const config = {
  issuer: 'https://sso.ayunis.de',
  clientId: 'ayunis-core-client',
  clientSecret: 'client-secret',
  callbackUrl: 'https://core.ayunis.de/api/auth/sso/oidc/callback',
  allowInsecureRequests: false,
};

describe('ZitadelOidcBrokerClient', () => {
  const discovered = {
    serverMetadata: () => ({ issuer: config.issuer }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(oidc.discovery).mockResolvedValue(discovered as never);
    jest.mocked(oidc.randomPKCECodeVerifier).mockReturnValue('pkce-verifier');
    jest
      .mocked(oidc.calculatePKCECodeChallenge)
      .mockResolvedValue('pkce-challenge');
    jest.mocked(oidc.randomState).mockReturnValue('oauth-state');
    jest.mocked(oidc.randomNonce).mockReturnValue('oidc-nonce');
    jest
      .mocked(oidc.buildAuthorizationUrl)
      .mockReturnValue(
        new URL('https://sso.ayunis.de/oauth/v2/authorize?request=created'),
      );
  });

  it('pins the Zitadel organization in a PKCE authorization request', async () => {
    const client = buildClient(config);

    await expect(
      client.createAuthorizationRequest({ zitadelOrgId: '385820595704561666' }),
    ).resolves.toEqual({
      authorizationUrl:
        'https://sso.ayunis.de/oauth/v2/authorize?request=created',
      codeVerifier: 'pkce-verifier',
      nonce: 'oidc-nonce',
      state: 'oauth-state',
    });
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(discovered, {
      redirect_uri: config.callbackUrl,
      scope:
        'openid profile email urn:zitadel:iam:user:resourceowner ' +
        'urn:zitadel:iam:org:id:385820595704561666',
      code_challenge: 'pkce-challenge',
      code_challenge_method: 'S256',
      state: 'oauth-state',
      nonce: 'oidc-nonce',
    });
    expect(oidc.ClientSecretBasic).toHaveBeenCalledWith(config.clientSecret);
    expect(oidc.discovery).toHaveBeenCalledWith(
      new URL(config.issuer),
      config.clientId,
      config.clientSecret,
      'basic-client-auth',
      undefined,
    );
  });

  it('validates the callback against the exact state, nonce and PKCE verifier', async () => {
    const tokenResponse = {
      access_token: 'server-side-access-token',
      claims: () => ({
        sub: 'zitadel-user',
        sid: 'zitadel-session',
        amr: ['pwd', 'otp', 'mfa'],
      }),
    };
    jest
      .mocked(oidc.authorizationCodeGrant)
      .mockResolvedValue(tokenResponse as never);
    jest.mocked(oidc.fetchUserInfo).mockResolvedValue({
      sub: 'zitadel-user',
      email: 'staff@demo.com',
      name: 'Erika Mustermann',
      email_verified: true,
      'urn:zitadel:iam:user:resourceowner:id': '385820595704561666',
    });
    const client = buildClient(config);
    const callbackParameters = new URLSearchParams({
      code: 'authorization-code',
      state: 'oauth-state',
    });

    await expect(
      client.validateCallback({
        callbackParameters,
        codeVerifier: 'pkce-verifier',
        expectedState: 'oauth-state',
        expectedNonce: 'oidc-nonce',
      }),
    ).resolves.toEqual({
      issuer: config.issuer,
      subject: 'zitadel-user',
      email: 'staff@demo.com',
      name: 'Erika Mustermann',
      emailVerified: true,
      zitadelOrgId: '385820595704561666',
      sessionId: 'zitadel-session',
      authenticationMethods: ['pwd', 'otp', 'mfa'],
    });
    const expectedCallbackUrl = new URL(config.callbackUrl);
    expectedCallbackUrl.search = callbackParameters.toString();
    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
      discovered,
      expectedCallbackUrl,
      {
        pkceCodeVerifier: 'pkce-verifier',
        expectedState: 'oauth-state',
        expectedNonce: 'oidc-nonce',
        idTokenExpected: true,
      },
    );
    expect(oidc.fetchUserInfo).toHaveBeenCalledWith(
      discovered,
      'server-side-access-token',
      'zitadel-user',
    );
  });

  it('refuses to initialize from a partial relying-party configuration', async () => {
    const client = buildClient({ ...config, clientSecret: undefined });

    await expect(
      client.createAuthorizationRequest({ zitadelOrgId: '385820595704561666' }),
    ).rejects.toThrow(SsoBrokerNotConfiguredError);
    expect(oidc.discovery).not.toHaveBeenCalled();
  });

  it('maps a rejected OIDC protocol response to the SSO authentication error', async () => {
    jest
      .mocked(oidc.authorizationCodeGrant)
      .mockRejectedValue(new oidc.ClientError('unexpected nonce'));
    const client = buildClient(config);

    await expect(
      client.validateCallback({
        callbackParameters: new URLSearchParams({
          code: 'authorization-code',
          state: 'oauth-state',
        }),
        codeVerifier: 'pkce-verifier',
        expectedState: 'oauth-state',
        expectedNonce: 'oidc-nonce',
      }),
    ).rejects.toMatchObject({ code: 'SSO_BROKER_RESPONSE_INVALID' });
  });

  it('treats a malformed authentication-method claim as no MFA assurance', async () => {
    jest.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      access_token: 'server-side-access-token',
      claims: () => ({ sub: 'zitadel-user', amr: 'mfa' }),
    } as never);
    jest.mocked(oidc.fetchUserInfo).mockResolvedValue({
      sub: 'zitadel-user',
      email: 'staff@demo.com',
      name: 'Erika Mustermann',
      email_verified: true,
      'urn:zitadel:iam:user:resourceowner:id': '385820595704561666',
    });

    await expect(
      buildClient(config).validateCallback({
        callbackParameters: new URLSearchParams({
          code: 'authorization-code',
          state: 'oauth-state',
        }),
        codeVerifier: 'pkce-verifier',
        expectedState: 'oauth-state',
        expectedNonce: 'oidc-nonce',
      }),
    ).resolves.toMatchObject({ authenticationMethods: [] });
  });

  it.each([null, '', '   '])(
    'falls back to the email when optional profile names are %p',
    async (name) => {
      const tokenResponse = {
        access_token: 'server-side-access-token',
        claims: () => ({ sub: 'zitadel-user', sid: 'zitadel-session' }),
      };
      jest
        .mocked(oidc.authorizationCodeGrant)
        .mockResolvedValue(tokenResponse as never);
      jest.mocked(oidc.fetchUserInfo).mockResolvedValue({
        sub: 'zitadel-user',
        email: 'staff@demo.com',
        name,
        preferred_username: '',
        email_verified: true,
        'urn:zitadel:iam:user:resourceowner:id': '385820595704561666',
      } as never);

      const result = await buildClient(config).validateCallback({
        callbackParameters: new URLSearchParams({
          code: 'authorization-code',
          state: 'oauth-state',
        }),
        codeVerifier: 'pkce-verifier',
        expectedState: 'oauth-state',
        expectedNonce: 'oidc-nonce',
      });

      expect(result.name).toBe('staff@demo.com');
    },
  );

  it('classifies broker discovery transport failures as provider failures', async () => {
    const failure = Object.assign(new Error('connect failed'), {
      code: 'ECONNREFUSED',
      hostname: 'sso.ayunis.de',
    });
    jest.mocked(oidc.discovery).mockRejectedValue(failure);
    const client = buildClient(config);

    await expect(
      client.createAuthorizationRequest({
        zitadelOrgId: '385820595704561666',
      }),
    ).rejects.toBeInstanceOf(ProviderConnectionError);
  });

  it('enables insecure OIDC requests only when loopback development config permits it', async () => {
    const client = buildClient({ ...config, allowInsecureRequests: true });

    await client.createAuthorizationRequest({
      zitadelOrgId: '385820595704561666',
    });

    expect(oidc.discovery).toHaveBeenCalledWith(
      new URL(config.issuer),
      config.clientId,
      config.clientSecret,
      'basic-client-auth',
      // eslint-disable-next-line sonarjs/deprecation -- verifies loopback-only local support
      { execute: [oidc.allowInsecureRequests] },
    );
  });
});

function buildClient(values: Partial<typeof config>): ZitadelOidcBrokerClient {
  const configService = {
    get: jest.fn().mockReturnValue(values),
  };
  return new ZitadelOidcBrokerClient(configService as never);
}
