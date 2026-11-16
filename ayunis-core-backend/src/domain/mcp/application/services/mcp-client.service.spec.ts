import { setError } from '@appsignal/nodejs';
import { McpRuntimeConnectionError } from 'src/domain/mcp/application/mcp-runtime-connection.error';
import { McpConnectionHealthService } from './mcp-connection-health.service';
import { mcpConnectionRevision } from './mcp-connection-revision';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { McpClientService } from './mcp-client.service';
import { McpClientPort } from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { randomUUID } from 'crypto';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/oauth-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import {
  McpAuthenticationError,
  McpToolTimeoutError,
  McpUserAuthorizationRequiredError,
} from 'src/domain/mcp/application/mcp.errors';

jest.mock('@appsignal/nodejs', () => ({ setError: jest.fn() }));

class MockMcpClientPort extends McpClientPort {
  listTools = jest.fn();
  listResources = jest.fn();
  listResourceTemplates = jest.fn();
  listPrompts = jest.fn();
  callTool = jest.fn();
  readResource = jest.fn();
  getPrompt = jest.fn();
  verifyCredentials = jest.fn();
  validateConnection = jest.fn();
  invalidateConnections = jest.fn();
}

class MockCredentialEncryptionPort extends McpCredentialEncryptionPort {
  encrypt = jest.fn();
  decrypt = jest.fn();
}

class MockUserConfigRepository extends McpIntegrationUserConfigRepositoryPort {
  saveVerified = jest.fn();
  save = jest.fn();
  findByIntegrationAndUser = jest.fn();
  findByIntegrationIdsAndUser = jest.fn();
  deleteByIntegrationAndUser = jest.fn();
  deleteByIntegrationId = jest.fn();
  removeKeysByIntegrationId = jest.fn();
}

describe('McpClientService', () => {
  let service: McpClientService;
  let client: MockMcpClientPort;
  let encryption: MockCredentialEncryptionPort;
  let userConfigRepo: MockUserConfigRepository;

  const baseIntegrationParams = {
    id: randomUUID(),
    orgId: randomUUID(),
    name: 'Test Integration',
    serverUrl: 'https://example.com/mcp',
    enabled: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    connectionStatus: 'pending',
  } as const;

  beforeAll(async () => {
    client = new MockMcpClientPort();
    encryption = new MockCredentialEncryptionPort();
    userConfigRepo = new MockUserConfigRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpClientService,
        { provide: McpClientPort, useValue: client },
        { provide: McpCredentialEncryptionPort, useValue: encryption },
        {
          provide: McpIntegrationUserConfigRepositoryPort,
          useValue: userConfigRepo,
        },
      ],
    }).compile();

    module.useLogger(false);
    service = module.get(McpClientService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies the candidate token instead of loading the stored token', async () => {
    const integration = aCustomMcpIntegration({
      ...baseIntegrationParams,
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [],
        userFields: [
          {
            key: 'token',
            label: 'Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
      },
    });
    encryption.decrypt.mockResolvedValue('candidate-token');
    await service.verifyUserConfig(integration, randomUUID(), {
      token: 'encrypted:candidate-token',
    });
    expect(client.verifyCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'Bearer candidate-token' },
      }),
    );
    expect(userConfigRepo.findByIntegrationAndUser).not.toHaveBeenCalled();
    expect(client.invalidateConnections).not.toHaveBeenCalled();
  });

  it('records discovery health against the same credential snapshot sent to every capability request', async () => {
    const userId = randomUUID();
    const integration = aCustomMcpIntegration({
      ...baseIntegrationParams,
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [],
        userFields: [
          {
            key: 'token',
            label: 'Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
      },
    });
    const original = new McpIntegrationUserConfig({
      integrationId: integration.id,
      userId,
      configValues: { token: 'encrypted:original' },
    });
    userConfigRepo.findByIntegrationAndUser
      .mockResolvedValueOnce(original)
      .mockResolvedValue(null);
    encryption.decrypt.mockResolvedValue('original');
    client.listTools.mockResolvedValue([]);
    client.listResources.mockResolvedValue([]);
    client.listResourceTemplates.mockResolvedValue([]);
    client.listPrompts.mockResolvedValue([]);
    const record = jest.fn().mockResolvedValue(undefined);
    const observed = new McpClientService(
      client,
      encryption,
      userConfigRepo,
      undefined,
      undefined,
      new McpConnectionHealthService({ record, findForUser: jest.fn() }),
    );
    await observed.discoverCapabilities(integration, userId, {
      timeout: 10000,
    });
    expect(userConfigRepo.findByIntegrationAndUser).toHaveBeenCalledTimes(1);
    expect(client.listTools.mock.calls[0][0].headers).toEqual({
      Authorization: 'Bearer original',
    });
    expect(client.listPrompts.mock.calls[0][0]).toBe(
      client.listTools.mock.calls[0][0],
    );
    expect(record.mock.calls[0][0]).toMatchObject({
      revision: mcpConnectionRevision(integration, original, null),
      userId,
      failure: null,
    });
  });

  it.each(['readResource', 'getPrompt'] as const)(
    'reports a slow %s once without storing a broken connection',
    async (operation) => {
      const integration = aCustomMcpIntegration();
      const record = jest.fn().mockResolvedValue(undefined);
      const observed = new McpClientService(
        client,
        encryption,
        userConfigRepo,
        undefined,
        undefined,
        new McpConnectionHealthService({ record, findForUser: jest.fn() }),
      );
      const error = new McpToolTimeoutError(integration.serverUrl, 30_000);
      client[operation].mockRejectedValue(error);
      const request =
        operation === 'readResource'
          ? observed.readResource(
              integration,
              'fynn://guide',
              undefined,
              randomUUID(),
            )
          : observed.getPrompt(integration, 'summarize', {}, randomUUID());
      await expect(request).rejects.toBe(error);
      expect(record).not.toHaveBeenCalled();
      expect(setError).toHaveBeenCalledTimes(1);
      expect(setError).toHaveBeenCalledWith(error);
    },
  );

  describe('callTool', () => {
    it.each([
      ['MCP_CONNECTION_TIMEOUT', undefined, 504],
      ['MCP_CONNECTION_FAILED', undefined, 503],
      ['MCP_CONNECTION_TIMEOUT', randomUUID(), 504],
      ['MCP_CONNECTION_FAILED', randomUUID(), 503],
      ['CLIENT_HTTP_UNEXPECTED_CONTENT', undefined, 502],
      ['CLIENT_HTTP_UNEXPECTED_CONTENT', randomUUID(), 502],
    ] as const)(
      'reports one sanitized outage with or without personal health (%s, %s)',
      async (code, userId, statusCode) => {
        const integration = aCustomMcpIntegration({
          ...baseIntegrationParams,
          auth: new NoAuthMcpIntegrationAuth(),
        });
        const observed = new McpClientService(
          client,
          encryption,
          userConfigRepo,
          undefined,
          undefined,
          new McpConnectionHealthService({
            record: jest.fn().mockResolvedValue(undefined),
            findForUser: jest.fn(),
          }),
        );
        client.callTool.mockRejectedValue(
          Object.assign(new Error('private-token'), { code }),
        );
        await expect(
          observed.callTool(
            integration,
            {
              toolName: 'search_registry',
              parameters: {},
            },
            userId,
          ),
        ).rejects.toBeInstanceOf(McpRuntimeConnectionError);
        expect(setError).toHaveBeenCalledTimes(1);
        const reported: unknown = jest.mocked(setError).mock.calls[0][0];
        expect(reported).toBeInstanceOf(McpRuntimeConnectionError);
        expect(reported).toMatchObject({
          statusCode,
        });
        expect(reported).not.toHaveProperty('cause');
        expect(JSON.stringify(reported)).not.toContain('private-token');
      },
    );

    it("rejects with the caller's cancellation instead of the mapped transport error", async () => {
      const integration = aCustomMcpIntegration({
        ...baseIntegrationParams,
        auth: new NoAuthMcpIntegrationAuth(),
      });
      const controller = new AbortController();
      const cancellation = new Error('Run consumer abandoned the stream');
      client.callTool.mockImplementation(() => {
        controller.abort(cancellation);
        return Promise.reject(
          new McpToolTimeoutError('https://example.com/mcp', 30000),
        );
      });

      const result = service.callTool(integration, {
        toolName: 'search_registry',
        parameters: { query: 'water supply' },
        signal: controller.signal,
      });

      await expect(result).rejects.toBe(cancellation);
    });
  });

  describe('invalidateConnections', () => {
    it('invalidates the integration connection scope for one user', async () => {
      const integration = aCustomMcpIntegration(baseIntegrationParams);
      const userId = randomUUID();

      await service.invalidateConnections(integration, userId);

      expect(client.invalidateConnections).toHaveBeenCalledWith({
        orgId: integration.orgId,
        integrationId: integration.id,
        userId,
      });
    });
  });

  describe('buildConnectionConfig', () => {
    it('resolves schema-configured custom integration headers', async () => {
      const integration = aCustomMcpIntegration({
        ...baseIntegrationParams,
        auth: new NoAuthMcpIntegrationAuth(),
        configSchema: {
          authType: 'CUSTOM',
          orgFields: [
            {
              key: 'tenantId',
              label: 'Tenant ID',
              type: 'text',
              headerName: 'X-Tenant-ID',
              required: true,
            },
          ],
          userFields: [
            {
              key: 'personalToken',
              label: 'Personal token',
              type: 'secret',
              headerName: 'Authorization',
              prefix: 'Bearer ',
              required: true,
            },
          ],
        },
        orgConfigValues: { tenantId: 'council-42' },
      });
      const userId = randomUUID();
      userConfigRepo.findByIntegrationAndUser.mockResolvedValue(
        new McpIntegrationUserConfig({
          integrationId: integration.id,
          userId,
          configValues: { personalToken: 'encrypted-personal-token' },
        }),
      );
      encryption.decrypt.mockResolvedValue('personal-token');

      const config = await service.buildConnectionConfig(integration, userId);

      expect(config.headers).toEqual({
        'X-Tenant-ID': 'council-42',
        Authorization: 'Bearer personal-token',
      });
      expect(config.connectionScope).toEqual({
        orgId: integration.orgId,
        integrationId: integration.id,
        userId,
      });
    });

    it('returns base config with empty headers for no-auth integrations', async () => {
      const integration = aCustomMcpIntegration({
        ...baseIntegrationParams,
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const config = await service.buildConnectionConfig(integration);

      expect(config).toMatchObject({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: {},
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
        oauth: undefined,
      });
      expect(encryption.decrypt).not.toHaveBeenCalled();
    });

    it('builds config with Authorization header for bearer auth', async () => {
      const auth = new BearerMcpIntegrationAuth({
        authToken: 'encrypted-token',
      });
      const integration = new PredefinedMcpIntegration({
        ...baseIntegrationParams,
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth,
      });

      encryption.decrypt.mockResolvedValue('decrypted-token');

      const config = await service.buildConnectionConfig(integration);

      expect(config).toMatchObject({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { Authorization: 'Bearer decrypted-token' },
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
      });
    });

    it('builds config with custom header for legacy auth strategies', async () => {
      const auth = new CustomHeaderMcpIntegrationAuth({
        secret: 'encrypted-secret',
        headerName: 'X-API-Key',
      });
      const integration = new PredefinedMcpIntegration({
        ...baseIntegrationParams,
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth,
      });

      encryption.decrypt.mockResolvedValue('decrypted-secret');

      const config = await service.buildConnectionConfig(integration);

      expect(config).toMatchObject({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { 'X-API-Key': 'decrypted-secret' },
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
      });
    });

    it('builds config with Authorization header for oauth auth with valid token', async () => {
      const auth = new OAuthMcpIntegrationAuth({
        clientId: 'client',
        clientSecret: 'secret',
        accessToken: 'encrypted-token',
        tokenExpiresAt: new Date(Date.now() + 60_000),
      });
      const integration = new PredefinedMcpIntegration({
        ...baseIntegrationParams,
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth,
      });

      encryption.decrypt.mockResolvedValue('decrypted-token');

      const config = await service.buildConnectionConfig(integration);

      expect(config).toMatchObject({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { Authorization: 'Bearer decrypted-token' },
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
      });
    });

    it('throws if bearer auth token missing', async () => {
      const auth = new BearerMcpIntegrationAuth();
      const integration = new PredefinedMcpIntegration({
        ...baseIntegrationParams,
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth,
      });

      await expect(
        service.buildConnectionConfig(integration),
      ).rejects.toBeInstanceOf(McpAuthenticationError);
    });

    it('throws if oauth token expired', async () => {
      const auth = new OAuthMcpIntegrationAuth({
        accessToken: 'encrypted-token',
        tokenExpiresAt: new Date(Date.now() - 60_000),
      });
      const integration = new PredefinedMcpIntegration({
        ...baseIntegrationParams,
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth,
      });

      await expect(
        service.buildConnectionConfig(integration),
      ).rejects.toBeInstanceOf(McpAuthenticationError);
    });
  });

  describe('buildConnectionConfig — marketplace integrations', () => {
    const buildMarketplaceIntegration = (
      configSchema: IntegrationConfigSchema,
      orgConfigValues: Record<string, string>,
    ) =>
      new MarketplaceMcpIntegration({
        id: baseIntegrationParams.id,
        orgId: baseIntegrationParams.orgId,
        name: 'OParl Integration',
        serverUrl: 'https://mcp.ayunis.de/oparl',
        marketplaceIdentifier: 'oparl-mcp',
        configSchema,
        orgConfigValues,
        auth: new NoAuthMcpIntegrationAuth(),
      });

    it('maps org config fields to headers based on headerName', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'NO_AUTH',
        orgFields: [
          {
            key: 'oparlEndpointUrl',
            label: 'OParl Endpoint URL',
            type: 'url',
            headerName: 'X-Oparl-Endpoint-Url',
            required: true,
          },
        ],
        userFields: [],
      };
      const integration = buildMarketplaceIntegration(schema, {
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl',
      });

      const config = await service.buildConnectionConfig(integration);

      expect(config).toMatchObject({
        serverUrl: 'https://mcp.ayunis.de/oparl',
        headers: { 'X-Oparl-Endpoint-Url': 'https://rim.ekom21.de/oparl' },
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
        oauth: undefined,
      });
      expect(encryption.decrypt).not.toHaveBeenCalled();
    });

    it('decrypts secret fields and applies prefix', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'apiToken',
            label: 'API Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [],
      };
      const integration = buildMarketplaceIntegration(schema, {
        apiToken: 'encrypted-token-value',
      });

      encryption.decrypt.mockResolvedValue('sk-live-abc123');

      const config = await service.buildConnectionConfig(integration);

      expect(config.headers).toEqual({
        Authorization: 'Bearer sk-live-abc123',
      });
      expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-token-value');
    });

    it('skips fields without headerName', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: true,
          },
          {
            key: 'tenantId',
            label: 'Tenant ID',
            type: 'text',
            headerName: 'X-Tenant-Id',
            required: true,
          },
        ],
        userFields: [],
      };
      const integration = buildMarketplaceIntegration(schema, {
        clientId: 'my-client',
        tenantId: 'tenant-42',
      });

      const config = await service.buildConnectionConfig(integration);

      expect(config.headers).toEqual({ 'X-Tenant-Id': 'tenant-42' });
    });

    it('applies user config overrides for matching headerNames', async () => {
      const userId = randomUUID();
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            label: 'Default API Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Access Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: false,
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        orgToken: 'encrypted-org-token',
      });

      encryption.decrypt
        .mockResolvedValueOnce('org-token-decrypted')
        .mockResolvedValueOnce('personal-token-decrypted');

      userConfigRepo.findByIntegrationAndUser.mockResolvedValue(
        new McpIntegrationUserConfig({
          integrationId: integration.id,
          userId,
          configValues: { personalToken: 'encrypted-personal-token' },
        }),
      );

      const config = await service.buildConnectionConfig(integration, userId);

      expect(config.headers).toEqual({
        Authorization: 'Bearer personal-token-decrypted',
      });
      expect(userConfigRepo.findByIntegrationAndUser).toHaveBeenCalledWith(
        integration.id,
        userId,
      );
    });

    it('uses org values when no user config exists', async () => {
      const userId = randomUUID();
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            label: 'Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: false,
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        orgToken: 'encrypted-org-token',
      });

      encryption.decrypt.mockResolvedValue('org-token-decrypted');
      userConfigRepo.findByIntegrationAndUser.mockResolvedValue(null);

      const config = await service.buildConnectionConfig(integration, userId);

      expect(config.headers).toEqual({
        Authorization: 'Bearer org-token-decrypted',
      });
    });

    it('does not query user config when no userId provided', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'apiToken',
            label: 'Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: false,
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        apiToken: 'encrypted-token',
      });

      encryption.decrypt.mockResolvedValue('decrypted-token');

      await service.buildConnectionConfig(integration);

      expect(userConfigRepo.findByIntegrationAndUser).not.toHaveBeenCalled();
    });

    it('throws when a required user field is missing for the user', async () => {
      const userId = randomUUID();
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            label: 'Token',
            type: 'secret',
            headerName: 'X-Org',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        orgToken: 'encrypted-org-token',
      });

      userConfigRepo.findByIntegrationAndUser.mockResolvedValue(null);

      await expect(
        service.buildConnectionConfig(integration, userId),
      ).rejects.toBeInstanceOf(McpUserAuthorizationRequiredError);
    });

    it('does not enforce user authorization for org-level (no userId) operations', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            label: 'Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Token',
            type: 'secret',
            headerName: 'X-Personal',
            required: true,
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        orgToken: 'encrypted-org-token',
      });

      encryption.decrypt.mockResolvedValue('org-token-decrypted');

      const config = await service.buildConnectionConfig(integration);

      expect(config.headers).toEqual({
        Authorization: 'Bearer org-token-decrypted',
      });
      expect(userConfigRepo.findByIntegrationAndUser).not.toHaveBeenCalled();
    });

    it('applies system-fixed user field headers without a stored user config', async () => {
      const userId = randomUUID();
      const schema: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            label: 'Token',
            type: 'secret',
            headerName: 'X-Org',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal Token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
            value: 'fixed-personal-token',
          },
        ],
      };
      const integration = buildMarketplaceIntegration(schema, {
        orgToken: 'encrypted-org-token',
      });

      encryption.decrypt.mockResolvedValue('org-token-decrypted');
      userConfigRepo.findByIntegrationAndUser.mockResolvedValue(null);

      const config = await service.buildConnectionConfig(integration, userId);

      expect(config.headers).toEqual({
        'X-Org': 'org-token-decrypted',
        Authorization: 'Bearer fixed-personal-token',
      });
      expect(encryption.decrypt).toHaveBeenCalledTimes(1);
      expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-org-token');
    });

    it('handles multiple org fields mapping to different headers', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'CUSTOM_HEADER',
        orgFields: [
          {
            key: 'apiKey',
            label: 'API Key',
            type: 'secret',
            headerName: 'X-API-Key',
            required: true,
          },
          {
            key: 'tenantId',
            label: 'Tenant ID',
            type: 'text',
            headerName: 'X-Tenant-Id',
            required: true,
          },
        ],
        userFields: [],
      };
      const integration = buildMarketplaceIntegration(schema, {
        apiKey: 'encrypted-key',
        tenantId: 'tenant-42',
      });

      encryption.decrypt.mockResolvedValue('decrypted-api-key');

      const config = await service.buildConnectionConfig(integration);

      expect(config.headers).toEqual({
        'X-API-Key': 'decrypted-api-key',
        'X-Tenant-Id': 'tenant-42',
      });
    });

    it('returns empty headers when no org fields have values', async () => {
      const schema: IntegrationConfigSchema = {
        authType: 'NO_AUTH',
        orgFields: [],
        userFields: [],
      };
      const integration = buildMarketplaceIntegration(schema, {});

      const config = await service.buildConnectionConfig(integration);

      expect(config.headers).toEqual({});
    });

    it('allows org-level validation to build an OAuth config without a user grant', async () => {
      const integration = new MarketplaceMcpIntegration({
        ...baseIntegrationParams,
        auth: new NoAuthMcpIntegrationAuth(),
        marketplaceIdentifier: 'oauth-server',
        configSchema: {
          authType: 'OAUTH',
          orgFields: [],
          userFields: [],
          oauth: { clientRegistration: 'automatic' },
        },
        orgConfigValues: {},
      });

      await expect(
        service.buildConnectionConfig(integration),
      ).resolves.toMatchObject({
        serverUrl: integration.serverUrl,
        headers: {},
        connectionScope: {
          orgId: integration.orgId,
          integrationId: integration.id,
        },
        oauth: undefined,
      });
    });
  });
});
