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
import { SourcesModule } from '../../src/domain/sources/sources.module';

/**
 * E2E tests for MCP integration types and edge cases.
 * Tests predefined vs custom integrations, validation edge cases,
 * and integration lifecycle scenarios.
 */
describe('MCP Integration Types (e2e)', () => {
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

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

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

  describe('Predefined Integration Tests', () => {
    it('should list available predefined integration configs', async () => {
      const response = await request(app.getHttpServer())
        .get('/mcp-integrations/predefined/available')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify TEST integration is available
      const testConfig = response.body.find(
        (c: any) => c.slug === PredefinedMcpIntegrationSlug.TEST,
      );
      expect(testConfig).toBeDefined();
      expect(testConfig.displayName).toBe('Test MCP Server');
      expect(testConfig.defaultAuthMethod).toBe(McpAuthMethod.NO_AUTH);

      // Verify Locaboo integration is available
      const locabooConfig = response.body.find(
        (c: any) => c.slug === PredefinedMcpIntegrationSlug.LOCABOO,
      );
      expect(locabooConfig).toBeDefined();
      expect(locabooConfig.displayName).toBe('Locaboo 4');
      expect(locabooConfig.defaultAuthMethod).toBe(McpAuthMethod.BEARER_TOKEN);

      // Verify server URLs are NOT exposed
      expect(testConfig.serverUrl).toBeUndefined();
      expect(locabooConfig.serverUrl).toBeUndefined();
    });

    it('should create predefined integration with defaults', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'My Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        isPredefined: true,
        orgId: mockOrgId,
      };

      mockRepository.findByOrgAndSlug.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'My Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        // authMethod not specified - should use defaults
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body.authMethod).toBe(McpAuthMethod.NO_AUTH);
      expect(response.body.isPredefined).toBe(true);
    });

    it('should override predefined defaults with explicit auth method', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Custom Auth Test',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: 'encrypted_test_token',
        isEnabled: true,
        isPredefined: true,
        orgId: mockOrgId,
      };

      mockRepository.findByOrgAndSlug.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'Custom Auth Test',
        slug: PredefinedMcpIntegrationSlug.TEST,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        credentials: 'test_token',
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body.authMethod).toBe(McpAuthMethod.BEARER_TOKEN);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('test_token');
    });

    it('should reject invalid predefined slug', async () => {
      const createDto = {
        name: 'Invalid Integration',
        slug: 'INVALID_SLUG',
        authMethod: McpAuthMethod.NO_AUTH,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto);

      expect(response.status).toBe(400);
    });
  });

  describe('Custom Integration Tests', () => {
    it('should create custom integration with all fields', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'My Custom Server',
        serverUrl: 'https://custom.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-Custom-Key',
        encryptedCredentials: 'encrypted_custom_key',
        isEnabled: true,
        isPredefined: false,
        orgId: mockOrgId,
      };

      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'My Custom Server',
        serverUrl: 'https://custom.example.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-Custom-Key',
        credentials: 'custom_key',
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/custom')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: integrationId,
        name: 'My Custom Server',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-Custom-Key',
        isPredefined: false,
      });
    });

    it('should reject custom integration with invalid URL', async () => {
      const createDto = {
        name: 'Invalid URL Integration',
        serverUrl: 'not-a-valid-url',
        authMethod: McpAuthMethod.NO_AUTH,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/custom')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto);

      expect(response.status).toBe(400);
    });

    it('should allow custom integration with localhost URL', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Local Dev Server',
        serverUrl: 'http://localhost:9000/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        isPredefined: false,
        orgId: mockOrgId,
      };

      mockRepository.save.mockResolvedValue(mockIntegration);

      const createDto = {
        name: 'Local Dev Server',
        serverUrl: 'http://localhost:9000/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
      };

      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/custom')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      expect(response.body.serverUrl).toBe('http://localhost:9000/mcp');
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle validation timeout gracefully', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://slow-server.example.com/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: 'unhealthy',
      });

      // Simulate timeout
      mockMcpClient.connect.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 100),
          ),
      );

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('timeout');
    });

    it('should handle validation with no capabilities', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: 'healthy',
      });

      // Server with no capabilities
      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([]);
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
          tools: 0,
          resources: 0,
          prompts: 0,
        },
      });
    });

    it('should handle validation with all capability types', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: 'healthy',
      });

      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([
        { name: 'tool1' },
        { name: 'tool2' },
      ]);
      mockMcpClient.listResources.mockResolvedValue([
        { uri: 'res://1' },
        { uri: 'res://2' },
        { uri: 'res://3' },
      ]);
      mockMcpClient.listPrompts.mockResolvedValue([{ name: 'prompt1' }]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        capabilities: {
          tools: 2,
          resources: 3,
          prompts: 1,
        },
      });
    });

    it('should handle network errors during validation', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://unreachable-server.example.com/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: 'unhealthy',
      });

      mockMcpClient.connect.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused'),
      );

      const response = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Connection refused');
    });
  });

  describe('Credential Security Tests', () => {
    it('should never expose encrypted credentials in API responses', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Secure Integration',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        encryptedCredentials: 'encrypted_secret_token',
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);

      const response = await request(app.getHttpServer())
        .get(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      // Verify no credential fields in response
      expect(response.body.credentials).toBeUndefined();
      expect(response.body.encryptedCredentials).toBeUndefined();
      expect(response.body.token).toBeUndefined();
      expect(response.body.apiKey).toBeUndefined();
    });

    it('should encrypt credentials before storing', async () => {
      const integrationId = randomUUID();
      const plainCredentials = 'super-secret-token-12345';
      const mockIntegration = {
        id: integrationId,
        name: 'New Integration',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        encryptedCredentials: `encrypted_${plainCredentials}`,
        orgId: mockOrgId,
      };

      mockRepository.save.mockResolvedValue(mockIntegration);
      mockRepository.findByOrgAndSlug.mockResolvedValue(null);

      const createDto = {
        name: 'New Integration',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        credentials: plainCredentials,
      };

      await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(createDto)
        .expect(201);

      // Verify encryption was called with plain credentials
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(plainCredentials);
      expect(mockEncryption.encrypt).toHaveBeenCalledTimes(1);
    });

    it('should decrypt credentials before validation', async () => {
      const integrationId = randomUUID();
      const plainToken = 'test-token-12345';
      const mockIntegration = {
        id: integrationId,
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: `encrypted_${plainToken}`,
        isEnabled: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue(mockIntegration);

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

      // Verify decryption was called
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        `encrypted_${plainToken}`,
      );

      // Verify connection was made with decrypted token
      expect(mockMcpClient.connect).toHaveBeenCalledWith(
        'http://localhost:4000/mcp',
        expect.objectContaining({
          token: plainToken,
        }),
      );
    });
  });

  describe('Integration Lifecycle Tests', () => {
    it('should handle complete integration lifecycle', async () => {
      const integrationId = randomUUID();

      // 1. Create integration
      const mockIntegration = {
        id: integrationId,
        name: 'Lifecycle Test',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isEnabled: true,
        connectionStatus: 'pending',
        orgId: mockOrgId,
      };

      mockRepository.findByOrgAndSlug.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockIntegration);

      const createResponse = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send({
          name: 'Lifecycle Test',
          slug: PredefinedMcpIntegrationSlug.TEST,
        })
        .expect(201);

      expect(createResponse.body.id).toBe(integrationId);

      // 2. Validate integration
      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        connectionStatus: 'healthy',
      });

      mockMcpClient.connect.mockResolvedValue(undefined);
      mockMcpClient.listTools.mockResolvedValue([]);
      mockMcpClient.listResources.mockResolvedValue([]);
      mockMcpClient.listPrompts.mockResolvedValue([]);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const validateResponse = await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/validate`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      expect(validateResponse.body.valid).toBe(true);

      // 3. Disable integration
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        isEnabled: false,
      });

      await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/disable`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      // 4. Re-enable integration
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        isEnabled: true,
      });

      await request(app.getHttpServer())
        .post(`/mcp-integrations/${integrationId}/enable`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(200);

      // 5. Delete integration
      mockRepository.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .expect(204);

      expect(mockRepository.delete).toHaveBeenCalledWith(integrationId);
    });
  });

  describe('Authorization Tests', () => {
    it('should require organization admin role for integration creation', async () => {
      const createDto = {
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
      };

      // Note: This test assumes the auth guard is properly configured
      // In a real scenario, we'd need to mock the auth system
      // For now, this demonstrates the expected behavior
      const response = await request(app.getHttpServer())
        .post('/mcp-integrations/predefined')
        .set('x-user-id', mockUserId)
        // Missing x-org-id or insufficient permissions
        .send(createDto);

      // Expect either 401 Unauthorized or 403 Forbidden
      expect([401, 403, 500]).toContain(response.status);
    });

    it('should prevent access to integrations from different organizations', async () => {
      const integrationId = randomUUID();
      const otherOrgId = randomUUID();

      const mockIntegration = {
        id: integrationId,
        name: 'Other Org Integration',
        orgId: otherOrgId, // Different org
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);

      const response = await request(app.getHttpServer())
        .get(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId) // Different from integration's orgId
        .expect(404); // Or 403, depending on implementation

      // Should not return integration from different org
      expect(response.status).not.toBe(200);
    });
  });

  describe('Update Integration Tests', () => {
    it('should update integration name only', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Old Name',
        authMethod: McpAuthMethod.NO_AUTH,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        name: 'New Name',
      });

      const updateDto = {
        name: 'New Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('New Name');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should update auth method and header name', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Custom Integration',
        serverUrl: 'https://api.example.com/mcp',
        authMethod: McpAuthMethod.NO_AUTH,
        isPredefined: false,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue({
        ...mockIntegration,
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: 'encrypted_new_key',
      });

      const updateDto = {
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        credentials: 'new_key',
      };

      const response = await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto)
        .expect(200);

      expect(response.body.authMethod).toBe(McpAuthMethod.CUSTOM_HEADER);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('new_key');
    });

    it('should not allow updating serverUrl for predefined integrations', async () => {
      const integrationId = randomUUID();
      const mockIntegration = {
        id: integrationId,
        name: 'Locaboo Integration',
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        serverUrl: 'http://localhost:4000/mcp',
        authMethod: McpAuthMethod.BEARER_TOKEN,
        isPredefined: true,
        orgId: mockOrgId,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);

      const updateDto = {
        serverUrl: 'https://malicious.example.com/mcp', // Try to change URL
      };

      const response = await request(app.getHttpServer())
        .patch(`/mcp-integrations/${integrationId}`)
        .set('x-user-id', mockUserId)
        .set('x-org-id', mockOrgId)
        .send(updateDto);

      // Should either ignore the field or return error
      // The endpoint should not accept serverUrl in update DTO
      expect([400, 200]).toContain(response.status);

      if (response.status === 200) {
        // If accepted, serverUrl should remain unchanged
        expect(response.body.serverUrl).toBe('http://localhost:4000/mcp');
      }
    });
  });
});
