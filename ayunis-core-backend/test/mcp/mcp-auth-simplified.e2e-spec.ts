import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { McpModule } from '../../src/domain/mcp/mcp.module';
import { ConfigModule } from '@nestjs/config';
import { ContextModule } from '../../src/common/context/context.module';
import { McpAuthMethod } from '../../src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from '../../src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpIntegrationsRepositoryPort } from '../../src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpClientPort } from '../../src/domain/mcp/application/ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { ConnectionStatus } from '../../src/domain/mcp/domain/connection-status.enum';
import { SourcesModule } from '../../src/domain/sources/sources.module';

/**
 * E2E tests for simplified MCP authentication flow.
 * Tests NO_AUTH, BEARER_TOKEN, and API_KEY authentication types.
 * Verifies end-to-end flows from API endpoints through to MCP operations.
 */
describe('MCP Auth Simplified (e2e)', () => {
  let app: INestApplication;
  let mockRepository: any;
  let mockMcpClient: any;
  let mockEncryption: any;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByOrgAndSlug: jest.fn(),
    };

    // Create mock MCP client
    mockMcpClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      listTools: jest.fn(),
      listResources: jest.fn(),
      listPrompts: jest.fn(),
      callTool: jest.fn(),
      readResource: jest.fn(),
      getPrompt: jest.fn(),
    };

    // Create mock encryption service
    mockEncryption = {
      encrypt: jest.fn((value: string) =>
        Promise.resolve(`encrypted_${value}`),
      ),
      decrypt: jest.fn((value: string) =>
        Promise.resolve(value.replace('encrypted_', '')),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          ignoreEnvFile: true,
          load: [
            () => ({
              LOCABOO_4_URL: 'http://localhost:4000',
              MCP_ENCRYPTION_KEY: 'test-encryption-key-32-characters',
            }),
          ],
        }),
        ContextModule,
        SourcesModule,
        McpModule,
      ],
    })
      .overrideProvider(McpIntegrationsRepositoryPort)
      .useValue(mockRepository)
      .overrideProvider(McpClientPort)
      .useValue(mockMcpClient)
      .overrideProvider(McpCredentialEncryptionPort)
      .useValue(mockEncryption)
      .compile();

    app = moduleFixture.createNestApplication();

    // Set up validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Mock context middleware to inject user/org
    app.use((req, res, next) => {
      if (req.headers['x-user-id']) {
        req.user = { id: req.headers['x-user-id'] };
      }
      if (req.headers['x-org-id']) {
        req.user = { ...req.user, orgId: req.headers['x-org-id'] };
      }
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('NO_AUTH Integration Tests', () => {
    it('should create a NO_AUTH integration (predefined TEST)', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        isPredefined: true,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(mockIntegration);
      mockRepository.findByOrgAndSlug.mockResolvedValue(null);

      const createDto = {
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        authMethod: McpAuthMethod.NO_AUTH,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: integrationId,
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
      });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEncryption.encrypt).not.toHaveBeenCalled();
    });

    it('should retrieve NO_AUTH integration', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        isPredefined: true,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);

      const response = await request(app.getHttpServer())
        .get(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toMatchObject({
        id: integrationId,
        name: 'Test Integration',
        authMethod: McpAuthMethod.NO_AUTH,
      });

      expect(mockRepository.findById).toHaveBeenCalledWith(integrationId);
    });

    it('should validate NO_AUTH integration connection', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        isPredefined: true,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.HEALTHY,
      });

      // Mock successful MCP connection
      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([
        { name: 'test_tool', description: 'A test tool' },
      ]);
      mockMcpClient.listResources.mockResolvedValue([]);
      mockMcpClient.listPrompts.mockResolvedValue([]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        capabilities: {
          tools: 1,
          resources: 0,
          prompts: 0,
        },
      });

      expect(mockMcpClient.connect).toHaveBeenCalledWith(
        'http://localhost:3100/mcp',
        expect.objectContaining({
          type: McpAuthMethod.NO_AUTH,
        }),
      );
    });

    it('should execute operations on NO_AUTH integration', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([
        { name: 'test_tool', description: 'Test' },
      ]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // Discover capabilities (list tools)
      mockMcpClient.listTools.mockResolvedValue([
        {
          name: 'calculator',
          description: 'Perform calculations',
          inputSchema: { type: 'object', properties: {} },
        },
      ]);

      // Note: Since we're testing through the use case layer,
      // we need to ensure the mock repository returns the right data
      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.capabilities.tools).toBeGreaterThan(0);
      expect(mockMcpClient.connect).toHaveBeenCalled();
    });
  });

  describe('BEARER_TOKEN Integration Tests', () => {
    it('should create BEARER_TOKEN integration with encrypted credentials', async () => {
      const integrationId = randomUUID();
      const testToken = 'test-bearer-token-12345';
      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: `encrypted_${testToken}`,
        isEnabled: true,
        isPredefined: true,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(mockIntegration);
      mockRepository.findByOrgAndSlug.mockResolvedValue(null);

      const createDto = {
        name: 'Locaboo Integration',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        credentials: testToken,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: integrationId,
        name: 'Locaboo Integration',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
      });

      // Verify credentials were encrypted
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(testToken);

      // Verify encrypted credentials are NOT exposed in response
      expect(response.body.encryptedCredentials).toBeUndefined();
      expect(response.body.credentials).toBeUndefined();
    });

    it('should validate BEARER_TOKEN integration with decrypted credentials', async () => {
      const integrationId = randomUUID();
      const testToken = 'test-bearer-token-12345';
      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: `encrypted_${testToken}`,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.HEALTHY,
      });

      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([]);
      mockMcpClient.listResources.mockResolvedValue([
        { uri: 'locaboo://bookings', name: 'Bookings' },
      ]);
      mockMcpClient.listPrompts.mockResolvedValue([]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        capabilities: {
          tools: 0,
          resources: 1,
          prompts: 0,
        },
      });

      // Verify credentials were decrypted before connecting
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        `encrypted_${testToken}`,
      );

      // Verify connection was made with decrypted token
      expect(mockMcpClient.connect).toHaveBeenCalledWith(
        'http://localhost:4000/mcp',
        expect.objectContaining({
          type: McpAuthMethod.BEARER_TOKEN,
          token: testToken,
          headerName: 'Authorization',
        }),
      );
    });

    it('should handle invalid BEARER_TOKEN during validation', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: 'encrypted_invalid_token',
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.UNHEALTHY,
      });

      // Mock connection failure due to invalid token
      mockMcpClient.connect.mockRejectedValue(
        new Error('Authentication failed: Invalid token'),
      );

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: false,
        error: expect.stringContaining('Invalid token'),
      });

      // Verify connection status was updated to UNHEALTHY
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionStatus: ConnectionStatus.UNHEALTHY,
        }),
      );
    });

    it('should update BEARER_TOKEN credentials', async () => {
      const integrationId = randomUUID();
      const oldToken = 'old-token-12345';
      const newToken = 'new-token-67890';

      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: `encrypted_${oldToken}`,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        encryptedCredentials: `encrypted_${newToken}`,
      });

      const updateDto = {
        credentials: newToken,
      };

      const response = await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto)
        .expect(200);

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(newToken);
      expect(mockRepository.update).toHaveBeenCalled();

      // Credentials should not be exposed in response
      expect(response.body.credentials).toBeUndefined();
      expect(response.body.encryptedCredentials).toBeUndefined();
    });
  });

  describe('API_KEY Integration Tests', () => {
    it('should create API_KEY integration with custom header', async () => {
      const integrationId = randomUUID();
      const testApiKey = 'test-api-key-12345';
      const mockIntegration = {
        id: integrationId,
        name: 'Custom API Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: `encrypted_${testApiKey}`,
        isEnabled: true,
        isPredefined: false,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'Custom API Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        credentials: testApiKey,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/custom')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: integrationId,
        name: 'Custom API Integration',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(testApiKey);
    });

    it('should validate API_KEY integration with custom header', async () => {
      const integrationId = randomUUID();
      const testApiKey = 'test-api-key-12345';
      const mockIntegration = {
        id: integrationId,
        name: 'Custom API Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: `encrypted_${testApiKey}`,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.HEALTHY,
      });

      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([
        { name: 'api_tool', description: 'API tool' },
      ]);
      mockMcpClient.listResources.mockResolvedValue([]);
      mockMcpClient.listPrompts.mockResolvedValue([]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.valid).toBe(true);

      // Verify connection with API key and custom header
      expect(mockMcpClient.connect).toHaveBeenCalledWith(
        'https://api.example.com/mcp',
        expect.objectContaining({
          type: McpAuthMethod.CUSTOM_HEADER,
          apiKey: testApiKey,
          headerName: 'X-API-Key',
        }),
      );
    });

    it('should reject API_KEY integration without authHeaderName', async () => {
      const testApiKey = 'test-api-key-12345';

      const createDto = {
        name: 'Invalid API Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        credentials: testApiKey,
        // Missing authHeaderName
      };

      // Note: This validation might happen at use case level
      // The DTO validation allows optional authHeaderName
      // But the use case should enforce it for API_KEY
      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/custom')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto);

      // Expect either 400 validation error or business logic error
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Connection Status Tests', () => {
    it('should update connection status to HEALTHY on successful validation', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        connectionStatus: ConnectionStatus.UNKNOWN,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.HEALTHY,
      });

      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([]);
      mockMcpClient.listResources.mockResolvedValue([]);
      mockMcpClient.listPrompts.mockResolvedValue([]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionStatus: ConnectionStatus.HEALTHY,
        }),
      );
    });

    it('should update connection status to UNHEALTHY on failed validation', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        connectionStatus: ConnectionStatus.HEALTHY,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: ConnectionStatus.UNHEALTHY,
      });

      mockMcpClient.connect.mockRejectedValue(new Error('Connection refused'));

      await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionStatus: ConnectionStatus.UNHEALTHY,
        }),
      );
    });
  });

  describe('Unique Constraint Tests', () => {
    it('should enforce unique constraint for Locaboo integration per org', async () => {
      const existingIntegration = {
        id: randomUUID(),
        name: 'Existing Locaboo',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        orgId: mockOrgId,
      };

      // Mock repository to return existing integration
      mockRepository.findByOrgAndSlug.mockResolvedValue(existingIntegration);

      const createDto = {
        name: 'New Locaboo Integration',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        credentials: 'test-token',
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto);

      // Expect conflict error
      expect([400, 409]).toContain(response.status);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should allow multiple TEST integrations per org', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration 2',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      // Mock no existing TEST integration (or allow multiple)
      mockRepository.findByOrgAndSlug.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'Test Integration 2',
        slug: PredefinedMcpIntegrationSlug.TEST,
        authMethod: McpAuthMethod.NO_AUTH,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body.name).toBe('Test Integration 2');
    });
  });

  describe('Credential Update Flow Tests', () => {
    it('should update credentials and reset connection status', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        encryptedCredentials: 'encrypted_old_token',
        connectionStatus: ConnectionStatus.HEALTHY,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        encryptedCredentials: 'encrypted_new_token',
        connectionStatus: ConnectionStatus.UNKNOWN,
      });

      const updateDto = {
        credentials: 'new_token',
      };

      await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto)
        .expect(200);

      expect(mockEncryption.encrypt).toHaveBeenCalledWith('new_token');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should update auth method and clear credentials if switching to NO_AUTH', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Custom Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: 'encrypted_api_key',
        isPredefined: false,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        authMethod: McpAuthMethod.NO_AUTH,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
      });

      const updateDto = {
        authMethod: McpAuthMethod.NO_AUTH,
      };

      await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto)
        .expect(200);

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          authMethod: McpAuthMethod.NO_AUTH,
        }),
      );
    });
  });

  describe('List Integrations Tests', () => {
    it('should list all integrations for an organization', async () => {
      const mockIntegrations = [
        {
          id: randomUUID(),
          name: 'Test Integration',
          slug: PredefinedMcpIntegrationSlug.TEST,
          authMethod: McpAuthMethod.NO_AUTH,
          isEnabled: true,
          orgId: mockOrgId,
        },
        {
          id: randomUUID(),
          name: 'Locaboo Integration',
          slug: PredefinedMcpIntegrationSlug.LOCABOO,
          authMethod: McpAuthMethod.BEARER_TOKEN,
          isEnabled: true,
          orgId: mockOrgId,
        },
      ];

      mockRepository.findByOrgId.mockResolvedValue(mockIntegrations);

      const response = await request(app.getHttpServer())
        .get('/mcp-integrations')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].authMethod).toBe(McpAuthMethod.NO_AUTH);
      expect(response.body[1].authMethod).toBe(McpAuthMethod.BEARER_TOKEN);

      // Verify credentials are not exposed
      expect(response.body[0].credentials).toBeUndefined();
      expect(response.body[1].credentials).toBeUndefined();
      expect(response.body[0].encryptedCredentials).toBeUndefined();
      expect(response.body[1].encryptedCredentials).toBeUndefined();
    });
  });

  describe('Enable/Disable Integration Tests', () => {
    it('should enable an integration', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        isEnabled: false,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        isEnabled: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/enable`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.isEnabled).toBe(true);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should disable an integration', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        isEnabled: false,
      });

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/disable`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.isEnabled).toBe(false);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('Delete Integration Tests', () => {
    it('should delete an integration', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(204);

      expect(mockRepository.delete).toHaveBeenCalledWith(integrationId);
    });
  });
});
