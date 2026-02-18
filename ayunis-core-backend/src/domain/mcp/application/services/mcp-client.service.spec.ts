import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { McpClientService } from './mcp-client.service';
import { McpClientPort } from '../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { randomUUID } from 'crypto';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
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

describe('McpClientService', () => {
  let service: McpClientService;
  let client: MockMcpClientPort;
  let encryption: MockCredentialEncryptionPort;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpClientService,
        { provide: McpClientPort, useValue: client },
        { provide: McpCredentialEncryptionPort, useValue: encryption },
      ],
    }).compile();

    module.useLogger(false);
    service = module.get(McpClientService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
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
});
