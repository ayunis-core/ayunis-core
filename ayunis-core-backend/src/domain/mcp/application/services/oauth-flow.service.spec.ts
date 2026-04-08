import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomUUID, type UUID } from 'crypto';
import { OAuthFlowService } from './oauth-flow.service';
import { McpOAuthStatePort } from '../ports/mcp-oauth-state.port';
import { McpIntegrationOAuthTokenRepositoryPort } from '../ports/mcp-integration-oauth-token.repository.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpIntegrationsRepositoryPort } from '../ports/mcp-integrations.repository.port';
import { McpIntegrationOAuthToken } from '../../domain/mcp-integration-oauth-token.entity';
import { SelfDefinedMcpIntegration } from '../../domain/integrations/self-defined-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';
import type { McpOAuthAuthorizationState } from '../ports/mcp-oauth-state.port';
import {
  McpOAuthClientNotConfiguredError,
  McpOAuthAuthorizationRequiredError,
  McpOAuthStateInvalidError,
  McpOAuthExchangeFailedError,
  McpInvalidConfigSchemaError,
  McpIntegrationNotFoundError,
} from '../mcp.errors';

// ── SDK mocks ─────────────────────────────────────────────────────
const mockExchangeAuthorization = jest.fn();
const mockRefreshAuthorization = jest.fn();

jest.mock('@modelcontextprotocol/sdk/client/auth.js', () => ({
  exchangeAuthorization: (...args: unknown[]) =>
    mockExchangeAuthorization(...args),
  refreshAuthorization: (...args: unknown[]) =>
    mockRefreshAuthorization(...args),
}));

// ── Mock port implementations ─────────────────────────────────────

class MockStateAdapter extends McpOAuthStatePort {
  sign = jest.fn();
  verify = jest.fn();
}

class MockTokenRepository extends McpIntegrationOAuthTokenRepositoryPort {
  findByIntegrationAndUser = jest.fn();
  save = jest.fn();
  deleteByIntegrationAndUser = jest.fn();
  deleteAllByIntegration = jest.fn();
}

class MockEncryption extends McpCredentialEncryptionPort {
  encrypt = jest.fn();
  decrypt = jest.fn();
}

class MockIntegrationsRepository extends McpIntegrationsRepositoryPort {
  findById = jest.fn();
  findByOrgId = jest.fn();
  findAll = jest.fn();
  save = jest.fn();
  delete = jest.fn();
  findByOrgIdAndSlug = jest.fn();
  findAvailableByOrgId = jest.fn();
  findByIds = jest.fn();
  findByOrgIdAndMarketplaceIdentifier = jest.fn();
}

// ── Helpers ───────────────────────────────────────────────────────

const OAUTH_CONFIG_SCHEMA: IntegrationConfigSchema = {
  authType: 'OAUTH',
  orgFields: [],
  userFields: [],
  oauth: {
    authorizationUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    scopes: ['read', 'write'],
    level: 'org',
  },
};

function buildIntegration(
  overrides?: Partial<{
    id: UUID;
    oauthClientId: string;
    oauthClientSecretEncrypted: string;
    configSchema: IntegrationConfigSchema;
    orgId: UUID;
  }>,
): SelfDefinedMcpIntegration {
  return new SelfDefinedMcpIntegration({
    id: overrides?.id ?? randomUUID(),
    orgId: overrides?.orgId ?? randomUUID(),
    name: 'Test Integration',
    serverUrl: 'https://mcp.example.com',
    configSchema: overrides?.configSchema ?? OAUTH_CONFIG_SCHEMA,
    orgConfigValues: {},
    auth: new NoAuthMcpIntegrationAuth(),
    oauthClientId: overrides?.oauthClientId ?? 'client-id',
    oauthClientSecretEncrypted:
      overrides?.oauthClientSecretEncrypted ?? 'encrypted-secret',
  });
}

// ── Tests ─────────────────────────────────────────────────────────

describe('OAuthFlowService', () => {
  let service: OAuthFlowService;
  let stateAdapter: MockStateAdapter;
  let tokenRepository: MockTokenRepository;
  let encryption: MockEncryption;
  let integrationsRepository: MockIntegrationsRepository;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthFlowService,
        { provide: McpOAuthStatePort, useClass: MockStateAdapter },
        {
          provide: McpIntegrationOAuthTokenRepositoryPort,
          useClass: MockTokenRepository,
        },
        { provide: McpCredentialEncryptionPort, useClass: MockEncryption },
        {
          provide: McpIntegrationsRepositoryPort,
          useClass: MockIntegrationsRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    service = module.get(OAuthFlowService);
    stateAdapter = module.get(McpOAuthStatePort);
    tokenRepository = module.get(McpIntegrationOAuthTokenRepositoryPort);
    encryption = module.get(McpCredentialEncryptionPort);
    integrationsRepository = module.get(McpIntegrationsRepositoryPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── buildAuthorizationUrl ───────────────────────────────────────

  describe('buildAuthorizationUrl', () => {
    it('should produce a valid OAuth authorization URL', async () => {
      const integration = buildIntegration();
      stateAdapter.sign.mockReturnValue('signed-state-jwt');

      const result = service.buildAuthorizationUrl(
        integration,
        'org',
        integration.orgId,
        null,
      );

      const url = new URL(result.url);
      expect(url.origin).toBe('https://auth.example.com');
      expect(url.pathname).toBe('/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('client-id');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/mcp-integrations/oauth/callback',
      );
      expect(url.searchParams.get('scope')).toBe('read write');
      expect(url.searchParams.get('state')).toBe('signed-state-jwt');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();

      // Verify state was signed with the right payload shape
      expect(stateAdapter.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: integration.id,
          level: 'org',
          orgId: integration.orgId,
          userId: null,
          codeVerifier: expect.any(String),
          redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
          nonce: expect.any(String),
        }),
        600,
      );
    });

    it('should throw McpOAuthClientNotConfiguredError when oauthClientId is missing', () => {
      const integration = new SelfDefinedMcpIntegration({
        orgId: randomUUID(),
        name: 'No Client',
        serverUrl: 'https://mcp.example.com',
        configSchema: OAUTH_CONFIG_SCHEMA,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
        // No oauthClientId / oauthClientSecretEncrypted
      });

      expect(() =>
        service.buildAuthorizationUrl(
          integration,
          'org',
          integration.orgId,
          null,
        ),
      ).toThrow(McpOAuthClientNotConfiguredError);
    });

    it('should throw McpInvalidConfigSchemaError when OAuth config is missing', () => {
      const integration = new SelfDefinedMcpIntegration({
        orgId: randomUUID(),
        name: 'No OAuth',
        serverUrl: 'https://mcp.example.com',
        configSchema: { authType: 'NONE', orgFields: [], userFields: [] },
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(() =>
        service.buildAuthorizationUrl(
          integration,
          'org',
          integration.orgId,
          null,
        ),
      ).toThrow(McpInvalidConfigSchemaError);
    });
  });

  // ── handleCallback ──────────────────────────────────────────────

  describe('handleCallback', () => {
    it('should exchange code for tokens and persist them', async () => {
      const integration = buildIntegration();
      const state: McpOAuthAuthorizationState = {
        integrationId: integration.id,
        level: 'org',
        orgId: integration.orgId,
        userId: null,
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        nonce: 'test-nonce',
      };

      stateAdapter.verify.mockReturnValue(state);
      integrationsRepository.findById.mockResolvedValue(integration);
      encryption.decrypt.mockResolvedValue('plain-client-secret');
      encryption.encrypt.mockImplementation(
        async (v: string) => `encrypted:${v}`,
      );
      mockExchangeAuthorization.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
      });
      tokenRepository.findByIntegrationAndUser.mockResolvedValue(null);
      tokenRepository.save.mockImplementation(async (t: unknown) => t);

      const result = await service.handleCallback('auth-code', 'state-jwt');

      expect(result.integrationId).toBe(integration.id);
      expect(result.level).toBe('org');
      expect(result.userId).toBeNull();

      expect(mockExchangeAuthorization).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.objectContaining({
          clientInformation: {
            client_id: 'client-id',
            client_secret: 'plain-client-secret',
          },
          authorizationCode: 'auth-code',
          codeVerifier: 'test-verifier',
          redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        }),
      );

      expect(tokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: integration.id,
          userId: null,
          accessTokenEncrypted: 'encrypted:new-access-token',
          refreshTokenEncrypted: 'encrypted:new-refresh-token',
        }),
      );
    });

    it('should clear stale refresh token when re-authorization response omits refresh_token', async () => {
      const integration = buildIntegration();
      const state: McpOAuthAuthorizationState = {
        integrationId: integration.id,
        level: 'org',
        orgId: integration.orgId,
        userId: null,
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        nonce: 'test-nonce',
      };

      stateAdapter.verify.mockReturnValue(state);
      integrationsRepository.findById.mockResolvedValue(integration);
      encryption.decrypt.mockResolvedValue('plain-client-secret');
      encryption.encrypt.mockImplementation(
        async (v: string) => `encrypted:${v}`,
      );

      // Exchange response omits refresh_token entirely
      mockExchangeAuthorization.mockResolvedValue({
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
      });

      // Existing token has a stale refresh token from a previous grant
      const existingToken = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        refreshTokenEncrypted: 'stale-encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() - 1000),
        scope: 'old-scope',
      });
      tokenRepository.findByIntegrationAndUser.mockResolvedValue(existingToken);
      tokenRepository.save.mockImplementation(async (t: unknown) => t);

      await service.handleCallback('auth-code', 'state-jwt');

      // The stale refresh token must be cleared, not preserved
      expect(existingToken.refreshTokenEncrypted).toBeUndefined();
    });

    it('should throw McpOAuthStateInvalidError on invalid state', async () => {
      stateAdapter.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.handleCallback('code', 'bad-state')).rejects.toThrow(
        McpOAuthStateInvalidError,
      );
    });

    it('should throw McpOAuthExchangeFailedError when SDK exchange fails', async () => {
      const integration = buildIntegration();
      const state: McpOAuthAuthorizationState = {
        integrationId: integration.id,
        level: 'org',
        orgId: integration.orgId,
        userId: null,
        codeVerifier: 'v',
        redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        nonce: 'n',
      };

      stateAdapter.verify.mockReturnValue(state);
      integrationsRepository.findById.mockResolvedValue(integration);
      encryption.decrypt.mockResolvedValue('plain-secret');
      mockExchangeAuthorization.mockRejectedValue(
        new Error('token_endpoint_error'),
      );

      await expect(service.handleCallback('code', 'state-jwt')).rejects.toThrow(
        McpOAuthExchangeFailedError,
      );
    });

    it('should throw McpIntegrationNotFoundError when integration is deleted between auth start and callback', async () => {
      const integrationId = randomUUID();
      const orgId = randomUUID();
      const state: McpOAuthAuthorizationState = {
        integrationId,
        level: 'org',
        orgId,
        userId: null,
        codeVerifier: 'v',
        redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        nonce: 'n',
      };

      stateAdapter.verify.mockReturnValue(state);
      integrationsRepository.findById.mockResolvedValue(null);

      await expect(service.handleCallback('code', 'state-jwt')).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
    });

    it('should throw McpOAuthStateInvalidError when orgId in state does not match integration', async () => {
      const integration = buildIntegration();
      const state: McpOAuthAuthorizationState = {
        integrationId: integration.id,
        level: 'org',
        orgId: randomUUID(), // different orgId
        userId: null,
        codeVerifier: 'v',
        redirectUri: 'http://localhost:3000/mcp-integrations/oauth/callback',
        nonce: 'n',
      };

      stateAdapter.verify.mockReturnValue(state);
      integrationsRepository.findById.mockResolvedValue(integration);

      await expect(service.handleCallback('code', 'state-jwt')).rejects.toThrow(
        McpOAuthStateInvalidError,
      );
    });
  });

  // ── getValidAccessToken ─────────────────────────────────────────

  describe('getValidAccessToken', () => {
    it('should return decrypted access token when not expired', async () => {
      const integration = buildIntegration();
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'encrypted-access',
        tokenExpiresAt: new Date(Date.now() + 3600_000),
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);
      encryption.decrypt.mockResolvedValue('plain-access-token');

      const result = await service.getValidAccessToken(integration, null);

      expect(result).toBe('plain-access-token');
      expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-access');
      expect(mockRefreshAuthorization).not.toHaveBeenCalled();
    });

    it('should throw McpOAuthAuthorizationRequiredError when no token exists', async () => {
      const integration = buildIntegration();
      tokenRepository.findByIntegrationAndUser.mockResolvedValue(null);

      await expect(
        service.getValidAccessToken(integration, null),
      ).rejects.toThrow(McpOAuthAuthorizationRequiredError);
    });

    it('should refresh when token is expired and refresh token exists', async () => {
      const integration = buildIntegration();
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        refreshTokenEncrypted: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() - 1000), // expired
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);
      encryption.decrypt
        .mockResolvedValueOnce('plain-refresh-token') // for refresh token
        .mockResolvedValueOnce('plain-client-secret'); // for client secret
      encryption.encrypt.mockImplementation(
        async (v: string) => `encrypted:${v}`,
      );

      mockRefreshAuthorization.mockResolvedValue({
        access_token: 'refreshed-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
      });

      // For the upsertTokens call — existing token lookup
      tokenRepository.findByIntegrationAndUser
        .mockResolvedValueOnce(token) // first call in getValidAccessToken
        .mockResolvedValueOnce(token); // second call in upsertTokens
      tokenRepository.save.mockImplementation(async (t: unknown) => t);

      const result = await service.getValidAccessToken(integration, null);

      expect(result).toBe('refreshed-access-token');
      expect(mockRefreshAuthorization).toHaveBeenCalled();
    });

    it('should preserve existing refresh token when refresh response omits refresh_token', async () => {
      const integration = buildIntegration();
      const existingRefreshEncrypted = 'encrypted-existing-refresh';
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        refreshTokenEncrypted: existingRefreshEncrypted,
        tokenExpiresAt: new Date(Date.now() - 1000), // expired
        scope: 'read write',
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);
      encryption.decrypt
        .mockResolvedValueOnce('plain-refresh-token') // for refresh token
        .mockResolvedValueOnce('plain-client-secret'); // for client secret
      encryption.encrypt.mockImplementation(
        async (v: string) => `encrypted:${v}`,
      );

      // Response omits refresh_token (RFC 6749 §6 — server reuses existing)
      mockRefreshAuthorization.mockResolvedValue({
        access_token: 'refreshed-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      tokenRepository.save.mockImplementation(async (t: unknown) => t);

      const result = await service.getValidAccessToken(integration, null);

      expect(result).toBe('refreshed-access-token');
      // The existing refresh token must be preserved, not cleared
      expect(token.refreshTokenEncrypted).toBe(existingRefreshEncrypted);
    });

    it('should clear tokenExpiresAt when refresh response omits expires_in (no refresh loop)', async () => {
      const integration = buildIntegration();
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        refreshTokenEncrypted: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() - 1000), // expired
        scope: 'read write',
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);
      encryption.decrypt
        .mockResolvedValueOnce('plain-refresh-token')
        .mockResolvedValueOnce('plain-client-secret');
      encryption.encrypt.mockImplementation(
        async (v: string) => `encrypted:${v}`,
      );

      // Response omits both refresh_token AND expires_in
      mockRefreshAuthorization.mockResolvedValue({
        access_token: 'refreshed-access-token',
        token_type: 'Bearer',
      });

      tokenRepository.save.mockImplementation(async (t: unknown) => t);

      const result = await service.getValidAccessToken(integration, null);

      expect(result).toBe('refreshed-access-token');
      // tokenExpiresAt must be cleared (not preserved as old expired value)
      expect(token.tokenExpiresAt).toBeUndefined();
      // Therefore isExpired() must return false (no known expiry = non-expiring)
      expect(token.isExpired()).toBe(false);
    });

    it('should delete token and throw when expired with no refresh token', async () => {
      const integration = buildIntegration();
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        tokenExpiresAt: new Date(Date.now() - 1000), // expired, no refresh
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);

      await expect(
        service.getValidAccessToken(integration, null),
      ).rejects.toThrow(McpOAuthAuthorizationRequiredError);

      expect(tokenRepository.deleteByIntegrationAndUser).toHaveBeenCalledWith(
        integration.id,
        null,
      );
    });

    it('should delete token and throw when refresh fails', async () => {
      const integration = buildIntegration();
      const token = new McpIntegrationOAuthToken({
        integrationId: integration.id,
        userId: null,
        accessTokenEncrypted: 'old-encrypted-access',
        refreshTokenEncrypted: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);
      encryption.decrypt
        .mockResolvedValueOnce('plain-refresh')
        .mockResolvedValueOnce('plain-client-secret');
      mockRefreshAuthorization.mockRejectedValue(new Error('refresh_revoked'));

      await expect(
        service.getValidAccessToken(integration, null),
      ).rejects.toThrow(McpOAuthAuthorizationRequiredError);

      expect(tokenRepository.deleteByIntegrationAndUser).toHaveBeenCalledWith(
        integration.id,
        null,
      );
    });
  });

  // ── revoke ──────────────────────────────────────────────────────

  describe('revoke', () => {
    it('should delete the token row', async () => {
      const integrationId = randomUUID();
      await service.revoke(integrationId, null);

      expect(tokenRepository.deleteByIntegrationAndUser).toHaveBeenCalledWith(
        integrationId,
        null,
      );
    });
  });

  // ── getStatus ───────────────────────────────────────────────────

  describe('getStatus', () => {
    it('should return authorized: false when no token exists', async () => {
      tokenRepository.findByIntegrationAndUser.mockResolvedValue(null);

      const result = await service.getStatus(randomUUID(), null);

      expect(result).toEqual({
        authorized: false,
        expiresAt: null,
        scope: null,
      });
    });

    it('should return authorized: true with token details', async () => {
      const expiresAt = new Date(Date.now() + 3600_000);
      const token = new McpIntegrationOAuthToken({
        integrationId: randomUUID(),
        userId: null,
        accessTokenEncrypted: 'enc',
        tokenExpiresAt: expiresAt,
        scope: 'read write',
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);

      const result = await service.getStatus(token.integrationId, null);

      expect(result.authorized).toBe(true);
      expect(result.scope).toBe('read write');
      // tokenExpiresAt returns a defensive copy
      expect(result.expiresAt?.getTime()).toBe(expiresAt.getTime());
    });

    it('should return authorized: false for expired token with no refresh token', async () => {
      const token = new McpIntegrationOAuthToken({
        integrationId: randomUUID(),
        userId: null,
        accessTokenEncrypted: 'enc',
        tokenExpiresAt: new Date(Date.now() - 1000), // expired
        scope: 'read write',
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);

      const result = await service.getStatus(token.integrationId, null);

      expect(result.authorized).toBe(false);
    });

    it('should return authorized: true for expired token with refresh token', async () => {
      const token = new McpIntegrationOAuthToken({
        integrationId: randomUUID(),
        userId: null,
        accessTokenEncrypted: 'enc',
        refreshTokenEncrypted: 'enc-refresh',
        tokenExpiresAt: new Date(Date.now() - 1000), // expired
        scope: 'read write',
      });

      tokenRepository.findByIntegrationAndUser.mockResolvedValue(token);

      const result = await service.getStatus(token.integrationId, null);

      expect(result.authorized).toBe(true);
    });
  });
});
