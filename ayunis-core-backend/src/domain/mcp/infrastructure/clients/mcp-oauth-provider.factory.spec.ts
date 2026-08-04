import { createHash, randomUUID } from 'crypto';
import {
  DurableMcpOAuthProvider,
  McpOAuthProviderFactory,
  type McpOAuthProviderContext,
} from './mcp-oauth-provider.factory';
import { auth } from '@modelcontextprotocol/client';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { McpOAuthClientRegistration } from '../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthUserToken } from '../../domain/mcp-oauth-user-token.entity';

jest.mock('@modelcontextprotocol/client', () => ({
  auth: jest.fn(),
}));

describe('DurableMcpOAuthProvider', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const integration = new MarketplaceMcpIntegration({
    orgId,
    name: 'OAuth server',
    serverUrl: 'https://mcp.example.com/mcp',
    auth: new NoAuthMcpIntegrationAuth(),
    marketplaceIdentifier: 'oauth-server',
    configSchema: {
      authType: 'OAUTH',
      orgFields: [],
      userFields: [],
      oauth: { clientRegistration: 'static', scopes: ['tools:read'] },
    },
    orgConfigValues: {},
  });
  const encryption = {
    encrypt: jest.fn(async (value: string) => `encrypted:${value}`),
    decrypt: jest.fn(async (value: string) => value.replace('encrypted:', '')),
  };
  const registrations = {
    findByIntegrationAndIssuer: jest.fn(),
    findUnboundByIntegration: jest.fn(),
    bindUnboundToIssuer: jest.fn(),
    save: jest.fn(),
  };
  const tokens = {
    findByIntegrationAndUser: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    withLockedToken: jest.fn(),
  };
  const pendingSessions = { save: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('binds a static client to the discovered issuer before returning it', async () => {
    const registration = new McpOAuthClientRegistration({
      integrationId: integration.id,
      issuer: 'https://auth.example.com',
      registrationMode: 'static',
      clientId: 'static-client',
      encryptedClientSecret: 'encrypted:secret',
    });
    registrations.findByIntegrationAndIssuer.mockResolvedValue(null);
    registrations.bindUnboundToIssuer.mockResolvedValue(registration);

    await expect(
      buildProvider().clientInformation({
        issuer: registration.issuer as string,
      }),
    ).resolves.toMatchObject({
      client_id: 'static-client',
      client_secret: 'secret',
      issuer: registration.issuer,
    });
    expect(registrations.bindUnboundToIssuer).toHaveBeenCalledWith(
      integration.id,
      registration.issuer,
    );
  });

  it('reloads a static client when another request wins the issuer bind race', async () => {
    const issuer = 'https://auth.example.com';
    const registration = new McpOAuthClientRegistration({
      integrationId: integration.id,
      issuer,
      registrationMode: 'static',
      clientId: 'static-client',
      encryptedClientSecret: 'encrypted:secret',
    });
    registrations.findByIntegrationAndIssuer
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(registration);
    registrations.bindUnboundToIssuer.mockResolvedValue(null);

    await expect(
      buildProvider().clientInformation({ issuer }),
    ).resolves.toMatchObject({
      client_id: 'static-client',
      client_secret: 'secret',
      issuer,
    });
    expect(registrations.findByIntegrationAndIssuer).toHaveBeenCalledTimes(2);
  });

  it('refuses to reuse or dynamically replace a static client for another issuer', async () => {
    registrations.findByIntegrationAndIssuer.mockResolvedValue(null);
    registrations.bindUnboundToIssuer.mockResolvedValue(null);

    await expect(
      buildProvider().clientInformation({
        issuer: 'https://changed-issuer.example.com',
      }),
    ).rejects.toThrow(
      'Static OAuth client is not registered for the discovered issuer',
    );
  });

  it('preserves a rotated refresh token when a response omits it', async () => {
    const current = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:old-access',
      encryptedRefreshToken: 'encrypted:rotated-refresh',
    });
    tokens.findByIntegrationAndUser.mockResolvedValue(current);
    tokens.save.mockImplementation(async (token: McpOAuthUserToken) => token);

    await buildProvider().saveTokens({
      access_token: 'new-access',
      token_type: 'Bearer',
      expires_in: 3600,
      issuer: current.issuer,
    });

    expect(tokens.save).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedAccessToken: 'encrypted:new-access',
        encryptedRefreshToken: 'encrypted:rotated-refresh',
      }),
    );
  });

  it('persists an explicit zero-second token expiry', async () => {
    tokens.findByIntegrationAndUser.mockResolvedValue(null);
    tokens.save.mockImplementation(async (token: McpOAuthUserToken) => token);

    await buildProvider().saveTokens({
      access_token: 'already-expired',
      token_type: 'Bearer',
      expires_in: 0,
      issuer: 'https://auth.example.com',
    });

    const saved = tokens.save.mock.calls[0][0] as McpOAuthUserToken;
    expect(saved.expiresAt).toBeInstanceOf(Date);
    expect(saved.expiresAt?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('invalidates tokens through the active database lock', async () => {
    const deleteLockedToken = jest.fn();

    await buildProvider({ deleteLockedToken }).invalidateCredentials('tokens');

    expect(deleteLockedToken).toHaveBeenCalledTimes(1);
    expect(tokens.delete).not.toHaveBeenCalled();
  });

  it('persists only a hash of state with encrypted PKCE verifier', async () => {
    const state = 'opaque-state';
    const provider = buildProvider({ state });
    await provider.saveDiscoveryState({
      authorizationServerUrl: 'https://auth.example.com',
      authorizationServerMetadata: {
        issuer: 'https://auth.example.com',
      },
    } as never);
    provider.saveCodeVerifier('pkce-verifier');

    await provider.redirectToAuthorization(
      new URL('https://auth.example.com/authorize'),
    );

    expect(pendingSessions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        stateHash: createHash('sha256').update(state).digest('hex'),
        encryptedCodeVerifier: 'encrypted:pkce-verifier',
        issuer: 'https://auth.example.com',
        userId,
        orgId,
      }),
    );
    expect(JSON.stringify(pendingSessions.save.mock.calls)).not.toContain(
      state,
    );
  });

  it('refreshes expired tokens through the guarded OAuth fetch boundary', async () => {
    const expired = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:expired-access',
      encryptedRefreshToken: 'encrypted:refresh-token',
      expiresAt: new Date(Date.now() - 60_000),
    });
    tokens.withLockedToken.mockImplementation(
      async (_integrationId, _userId, operation) =>
        operation(expired, jest.fn()),
    );
    (auth as jest.Mock).mockResolvedValue('AUTHORIZED');
    const oauthFetch = { fetch: jest.fn() };
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'mcp.frontendBaseUrl'
          ? 'https://app.example.com'
          : 'https://api.example.com',
      ),
      get: jest.fn(),
    };
    const factory = new McpOAuthProviderFactory(
      config as never,
      encryption,
      registrations as never,
      tokens as never,
      pendingSessions as never,
      oauthFetch,
    );

    await factory.prepareRuntime({ integration, userId, orgId });

    expect(auth).toHaveBeenCalledWith(expect.any(DurableMcpOAuthProvider), {
      serverUrl: integration.serverUrl,
      fetchFn: oauthFetch.fetch,
    });
  });

  it('clears an expired grant when refresh requires authorization', async () => {
    const expired = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:expired-access',
      encryptedRefreshToken: 'encrypted:refresh-token',
      expiresAt: new Date(Date.now() - 60_000),
    });
    const deleteLocked = jest.fn();
    tokens.withLockedToken.mockImplementation(
      async (_integrationId, _userId, operation) =>
        operation(expired, jest.fn(), deleteLocked),
    );
    (auth as jest.Mock).mockImplementation(
      async (provider: DurableMcpOAuthProvider) => {
        await provider.invalidateCredentials('tokens');
        return 'REDIRECT';
      },
    );
    const factory = new McpOAuthProviderFactory(
      buildConfig() as never,
      encryption,
      registrations as never,
      tokens as never,
      pendingSessions as never,
      { fetch: jest.fn() },
    );

    await expect(
      factory.prepareRuntime({ integration, userId, orgId }),
    ).rejects.toThrow('OAuth server');
    expect(deleteLocked).toHaveBeenCalledTimes(1);
    expect(tokens.delete).not.toHaveBeenCalled();
  });

  function buildProvider(
    overrides: Partial<McpOAuthProviderContext> = {},
  ): DurableMcpOAuthProvider {
    return new DurableMcpOAuthProvider(
      { integration, userId, orgId, ...overrides },
      'https://app.example.com/settings/integrations/oauth/callback',
      'https://api.example.com/api/mcp-integrations/oauth/client-metadata.json',
      encryption,
      registrations as never,
      tokens as never,
      pendingSessions as never,
    );
  }

  function buildConfig() {
    return {
      getOrThrow: jest.fn((key: string) =>
        key === 'mcp.frontendBaseUrl'
          ? 'https://app.example.com'
          : 'https://api.example.com',
      ),
      get: jest.fn(),
    };
  }
});
