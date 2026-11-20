import { McpConnectionHealthService } from 'src/domain/mcp/application/services/mcp-connection-health.service';
import { mcpConnectionRevision } from 'src/domain/mcp/application/services/mcp-connection-revision';
import { McpOAuthPendingSession } from 'src/domain/mcp/domain/mcp-oauth-pending-session.entity';
import { createHash, randomUUID } from 'crypto';
import {
  DurableMcpOAuthProvider,
  McpOAuthProviderFactory,
  type McpOAuthProviderContext,
} from './mcp-oauth-provider.factory';
import { auth } from '@modelcontextprotocol/client';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { McpOAuthClientRegistration } from 'src/domain/mcp/domain/mcp-oauth-client-registration.entity';
import { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';

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
    saveIfCurrent: jest.fn().mockResolvedValue(true),
    delete: jest.fn(),
    withLockedToken: jest.fn(),
  };
  const pendingSessions = { save: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    tokens.saveIfCurrent.mockResolvedValue(true);
  });

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

    expect(tokens.saveIfCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedAccessToken: 'encrypted:new-access',
        encryptedRefreshToken: 'encrypted:rotated-refresh',
      }),
      current.grantRevision,
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

  it('does not overwrite a reconnected grant with an older runtime refresh', async () => {
    const original = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:old',
    });
    tokens.findByIntegrationAndUser.mockResolvedValue(original);
    const provider = buildProvider();
    await provider.tokens();
    const replacement = new McpOAuthUserToken({
      id: original.id,
      integrationId: integration.id,
      userId,
      issuer: original.issuer,
      encryptedAccessToken: 'encrypted:reconnected',
    });
    tokens.findByIntegrationAndUser.mockResolvedValue(replacement);
    tokens.saveIfCurrent.mockResolvedValue(false);
    await expect(
      provider.saveTokens(
        { access_token: 'late-refresh', token_type: 'Bearer' },
        { issuer: original.issuer },
      ),
    ).rejects.toThrow('OAuth server');
    expect(tokens.save).not.toHaveBeenCalled();
    expect(tokens.saveIfCurrent).toHaveBeenCalledWith(
      expect.objectContaining({ grantRevision: original.grantRevision }),
      original.grantRevision,
    );
  });

  it('keeps a post-refresh outage visible against the current OAuth authorization', async () => {
    let stored = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:expired',
      encryptedRefreshToken: 'encrypted:refresh',
      expiresAt: new Date(0),
      updatedAt: new Date(0),
    });
    const revision = mcpConnectionRevision(integration, null, stored);
    tokens.withLockedToken.mockImplementation(async (_id, _user, operation) =>
      operation(stored, async (saved: McpOAuthUserToken) => {
        stored = saved;
        return saved;
      }),
    );
    (auth as jest.Mock).mockImplementation(
      async (provider: DurableMcpOAuthProvider) => {
        await provider.saveTokens(
          { access_token: 'refreshed', token_type: 'Bearer', expires_in: 3600 },
          { issuer: stored.issuer },
        );
        return 'AUTHORIZED';
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
    const record = jest.fn().mockResolvedValue(undefined);
    const health = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    await expect(
      health.observe(
        {
          serverUrl: integration.serverUrl,
          connectionScope: { integrationId: integration.id, userId, orgId },
          observationRevision: revision,
        },
        async () => {
          await factory.prepareRuntime({ integration, userId, orgId });
          throw Object.assign(new Error('Unavailable'), { status: 503 });
        },
      ),
    ).rejects.toMatchObject({ reason: 'unavailable' });
    expect(stored.encryptedAccessToken).toBe('encrypted:refreshed');
    expect(record.mock.calls[0][0]).toMatchObject({
      revision: mcpConnectionRevision(integration, null, stored),
      failure: 'unavailable',
    });
  });

  it('replaces health identity on successful interactive authorization while retaining the token row', async () => {
    const original = new McpOAuthUserToken({
      integrationId: integration.id,
      userId,
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:same',
    });
    tokens.findByIntegrationAndUser.mockResolvedValue(original);
    const pendingSession = new McpOAuthPendingSession({
      integrationId: integration.id,
      userId,
      orgId,
      issuer: original.issuer,
      stateHash: 'state',
      encryptedCodeVerifier: 'pkce',
      redirectUri: 'https://app.example.com/callback',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await buildProvider({ pendingSession }).saveTokens(
      { access_token: 'same', token_type: 'Bearer' },
      { issuer: original.issuer },
    );
    const replacement = tokens.save.mock.calls[0][0] as McpOAuthUserToken;
    expect(replacement.id).toBe(original.id);
    expect(typeof replacement.grantRevision).toBe('string');
    expect(replacement.grantRevision).not.toBe(original.grantRevision);
    expect(mcpConnectionRevision(integration, null, replacement)).not.toBe(
      mcpConnectionRevision(integration, null, original),
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
