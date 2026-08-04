import { BadRequestException } from '@nestjs/common';
import {
  auth,
  discoverOAuthProtectedResourceMetadata,
} from '@modelcontextprotocol/client';
import { createHash, randomUUID } from 'crypto';
import { McpOAuthAuthorizationService } from './mcp-oauth-authorization.service';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { McpOAuthPendingSession } from '../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthFetchService } from '../../infrastructure/clients/mcp-oauth-fetch.service';

jest.mock('@modelcontextprotocol/client', () => ({
  auth: jest.fn(),
  discoverOAuthProtectedResourceMetadata: jest.fn(),
}));

describe('McpOAuthAuthorizationService', () => {
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
      oauth: { clientRegistration: 'automatic', scopes: ['tools:read'] },
    },
    orgConfigValues: {},
  });
  const provider = {
    getAuthorizationUrl: jest.fn(),
  };
  const access = { validate: jest.fn() };
  const context = { get: jest.fn() };
  const providerFactory = { create: jest.fn() };
  const pendingSessions = { consumeByStateHash: jest.fn() };
  const tokens = { findByIntegrationAndUser: jest.fn(), delete: jest.fn() };
  const registrations = { findByIntegrationAndIssuer: jest.fn() };
  const encryption = { encrypt: jest.fn(), decrypt: jest.fn() };
  const cache = { invalidate: jest.fn() };
  const config = { get: jest.fn() };
  const oauthFetch = new McpOAuthFetchService(config as never);
  let service: McpOAuthAuthorizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.validate.mockResolvedValue(integration);
    context.get.mockImplementation((key: string) =>
      key === 'userId' ? userId : orgId,
    );
    providerFactory.create.mockReturnValue(provider);
    (discoverOAuthProtectedResourceMetadata as jest.Mock).mockResolvedValue({
      authorization_servers: ['https://auth.example.com'],
    });
    service = new McpOAuthAuthorizationService(
      access as never,
      context as never,
      providerFactory as never,
      pendingSessions as never,
      tokens as never,
      registrations as never,
      encryption,
      cache as never,
      oauthFetch,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses mandatory discovery and returns the SDK authorization URL', async () => {
    provider.getAuthorizationUrl.mockReturnValue(
      new URL('https://auth.example.com/authorize?state=opaque'),
    );
    (auth as jest.Mock).mockResolvedValue('REDIRECT');

    await expect(service.authorize(integration.id)).resolves.toEqual({
      authorizationUrl: 'https://auth.example.com/authorize?state=opaque',
    });
    expect(discoverOAuthProtectedResourceMetadata).toHaveBeenCalledWith(
      integration.serverUrl,
      undefined,
      oauthFetch.fetch,
    );
    expect(auth).toHaveBeenCalledWith(provider, {
      serverUrl: integration.serverUrl,
      scope: 'tools:read',
      fetchFn: oauthFetch.fetch,
    });
  });

  it('rejects missing protected-resource metadata', async () => {
    (discoverOAuthProtectedResourceMetadata as jest.Mock).mockResolvedValue(
      undefined,
    );

    await expect(service.authorize(integration.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(auth).not.toHaveBeenCalled();
  });

  it('atomically consumes state and completes the SDK callback flow', async () => {
    const state = 'opaque-state';
    const pending = buildPending(state);
    pendingSessions.consumeByStateHash.mockResolvedValue(pending);
    (auth as jest.Mock).mockResolvedValue('AUTHORIZED');

    await expect(service.complete({ state, code: 'code' })).resolves.toEqual({
      integrationId: integration.id,
    });
    expect(pendingSessions.consumeByStateHash).toHaveBeenCalledWith(
      createHash('sha256').update(state).digest('hex'),
      expect.any(Date),
    );
    expect(auth).toHaveBeenCalledWith(provider, {
      serverUrl: integration.serverUrl,
      authorizationCode: 'code',
      iss: pending.issuer,
      fetchFn: oauthFetch.fetch,
    });
    expect(cache.invalidate).toHaveBeenCalledWith(integration.id, userId);
  });

  it('rejects a callback when the SDK does not complete authorization', async () => {
    const state = 'opaque-state';
    pendingSessions.consumeByStateHash.mockResolvedValue(buildPending(state));
    (auth as jest.Mock).mockResolvedValue('REDIRECT');

    await expect(service.complete({ state, code: 'code' })).rejects.toThrow(
      'OAuth authorization could not be completed',
    );
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('rejects a callback issuer that differs from the pending session', async () => {
    const state = 'opaque-state';
    pendingSessions.consumeByStateHash.mockResolvedValue(buildPending(state));

    await expect(
      service.complete({
        state,
        code: 'code',
        iss: 'https://attacker.example.com',
      }),
    ).rejects.toThrow('OAuth authorization could not be completed');
    expect(auth).not.toHaveBeenCalled();
  });

  it('does not expose callback error details', async () => {
    pendingSessions.consumeByStateHash.mockResolvedValue(
      buildPending('opaque-state'),
    );

    await expect(
      service.complete({
        state: 'opaque-state',
        error: 'attacker-controlled-description',
      }),
    ).rejects.toThrow('OAuth authorization could not be completed');
  });

  it('does not send credentials to a private revocation endpoint', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    tokens.findByIntegrationAndUser.mockResolvedValue({
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted-access-token',
    });
    registrations.findByIntegrationAndIssuer.mockResolvedValue({
      clientId: 'council-documents-client',
      encryptedClientSecret: 'encrypted-client-secret',
      discoveryMetadata: {
        authorizationServerMetadata: {
          revocation_endpoint: 'https://127.0.0.1/oauth/revoke',
        },
      },
    });
    encryption.decrypt.mockResolvedValue('decrypted-secret');

    await service.disconnect(integration.id);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(tokens.delete).toHaveBeenCalledWith(integration.id, userId);
  });

  function buildPending(state: string): McpOAuthPendingSession {
    return new McpOAuthPendingSession({
      stateHash: createHash('sha256').update(state).digest('hex'),
      encryptedCodeVerifier: 'encrypted-verifier',
      redirectUri:
        'https://app.example.com/settings/integrations/oauth/callback',
      integrationId: integration.id,
      orgId,
      userId,
      issuer: 'https://auth.example.com',
      expiresAt: new Date(Date.now() + 60_000),
    });
  }
});
