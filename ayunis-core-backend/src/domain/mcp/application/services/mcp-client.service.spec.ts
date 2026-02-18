import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { McpClientService } from './mcp-client.service';
import { McpClientPort } from '../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpIntegrationUserConfigRepositoryPort } from '../ports/mcp-integration-user-config.repository.port';
import { randomUUID } from 'crypto';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { McpIntegrationUserConfig } from '../../domain/mcp-integration-user-config.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';
import { BearerMcpIntegrationAuth } from '../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../domain/auth/oauth-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { McpAuthenticationError } from '../mcp.errors';

class MockMcpClientPort extends McpClientPort {
  listTools = jest.fn();
  listResources = jest.fn();
  listResourceTemplates = jest.fn();
  listPrompts = jest.fn();
  callTool = jest.fn();
  readResource = jest.fn();
  getPrompt = jest.fn();
  validateConnection = jest.fn();
}

class MockCredentialEncryptionPort extends McpCredentialEncryptionPort {
  encrypt = jest.fn();
  decrypt = jest.fn();
}

class MockUserConfigRepository extends McpIntegrationUserConfigRepositoryPort {
  save = jest.fn();
  findByIntegrationAndUser = jest.fn();
  deleteByIntegrationId = jest.fn();
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

  beforeEach(async () => {
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

  describe('buildConnectionConfig', () => {
    it('returns base config with empty headers for no-auth integrations', async () => {
      const integration = new CustomMcpIntegration({
        ...baseIntegrationParams,
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const config = await service.buildConnectionConfig(integration);

      expect(config).toEqual({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: {},
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

      expect(config).toEqual({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { Authorization: 'Bearer decrypted-token' },
      });
    });

    it('builds config with custom header for custom header auth', async () => {
      const auth = new CustomHeaderMcpIntegrationAuth({
        secret: 'encrypted-secret',
        headerName: 'X-API-Key',
      });
      const integration = new CustomMcpIntegration({
        ...baseIntegrationParams,
        auth,
      });

      encryption.decrypt.mockResolvedValue('decrypted-secret');

      const config = await service.buildConnectionConfig(integration);

      expect(config).toEqual({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { 'X-API-Key': 'decrypted-secret' },
      });
    });

    it('builds config with Authorization header for oauth auth with valid token', async () => {
      const auth = new OAuthMcpIntegrationAuth({
        clientId: 'client',
        clientSecret: 'secret',
        accessToken: 'encrypted-token',
        tokenExpiresAt: new Date(Date.now() + 60_000),
      });
      const integration = new CustomMcpIntegration({
        ...baseIntegrationParams,
        auth,
      });

      encryption.decrypt.mockResolvedValue('decrypted-token');

      const config = await service.buildConnectionConfig(integration);

      expect(config).toEqual({
        serverUrl: baseIntegrationParams.serverUrl,
        headers: { Authorization: 'Bearer decrypted-token' },
      });
    });

    it('throws if bearer auth token missing', async () => {
      const auth = new BearerMcpIntegrationAuth();
      const integration = new CustomMcpIntegration({
        ...baseIntegrationParams,
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
      const integration = new CustomMcpIntegration({
        ...baseIntegrationParams,
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

      expect(config).toEqual({
        serverUrl: 'https://mcp.ayunis.de/oparl',
        headers: { 'X-Oparl-Endpoint-Url': 'https://rim.ekom21.de/oparl' },
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
        authType: 'OAUTH',
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
  });
});
