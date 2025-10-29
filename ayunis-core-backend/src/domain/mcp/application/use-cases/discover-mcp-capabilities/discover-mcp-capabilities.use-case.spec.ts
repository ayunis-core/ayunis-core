import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { DiscoverMcpCapabilitiesUseCase } from './discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientPort } from '../../ports/mcp-client.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

describe('DiscoverMcpCapabilitiesUseCase', () => {
  let useCase: DiscoverMcpCapabilitiesUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let mcpClient: McpClientPort;
  let registryService: PredefinedMcpIntegrationRegistryService;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverMcpCapabilitiesUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientPort,
          useValue: {
            listTools: jest.fn(),
            listResources: jest.fn(),
            listPrompts: jest.fn(),
          },
        },
        {
          provide: PredefinedMcpIntegrationRegistryService,
          useValue: {
            getConfig: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<DiscoverMcpCapabilitiesUseCase>(
      DiscoverMcpCapabilitiesUseCase,
    );
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
    );
    mcpClient = module.get<McpClientPort>(McpClientPort);
    registryService = module.get<PredefinedMcpIntegrationRegistryService>(
      PredefinedMcpIntegrationRegistryService,
    );
    contextService = module.get<ContextService>(ContextService);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully discover capabilities from enabled predefined integration', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      const mockTools = [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: { param1: { type: 'string' } },
            required: ['param1'],
          },
        },
      ];

      const mockResources = [
        {
          uri: 'file://test.txt',
          name: 'test.txt',
          description: 'A test file',
          mimeType: 'text/plain',
        },
      ];

      const mockPrompts = [
        {
          name: 'test_prompt',
          description: 'A test prompt',
          arguments: [{ name: 'arg1', required: true }],
        },
      ];

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue(mockTools);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue(mockResources);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue(mockPrompts);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('test_tool');
      expect(result.tools[0].integrationId).toBe(mockIntegrationId);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe('file://test.txt');
      expect(result.resources[0].integrationId).toBe(mockIntegrationId);
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('test_prompt');
      expect(result.prompts[0].integrationId).toBe(mockIntegrationId);

      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.listTools).toHaveBeenCalled();
      expect(mcpClient.listResources).toHaveBeenCalled();
      expect(mcpClient.listPrompts).toHaveBeenCalled();

      expect(loggerLogSpy).toHaveBeenCalledWith('discoverMcpCapabilities', {
        id: mockIntegrationId,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('discoverySucceeded', {
        id: mockIntegrationId,
        toolCount: 1,
        resourceCount: 1,
        promptCount: 1,
      });
    });

    it('should successfully discover capabilities from enabled custom integration', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration(
        mockIntegrationId,
        'Custom Integration',
        mockOrgId,
        'http://custom-server.com/mcp',
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'encrypted-token',
        new Date(),
        new Date(),
      );

      const mockTools = [
        { name: 'custom_tool', inputSchema: { type: 'object' } },
      ];
      const mockResources = [];
      const mockPrompts = [];

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue(mockTools);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue(mockResources);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue(mockPrompts);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
      expect(mcpClient.listTools).toHaveBeenCalledWith({
        serverUrl: 'http://custom-server.com/mcp',
        authHeaderName: 'Authorization',
        authToken: 'encrypted-token',
      });
    });

    it('should return empty arrays when MCP server has no capabilities', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Empty Server',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue([]);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.tools).toEqual([]);
      expect(result.resources).toEqual([]);
      expect(result.prompts).toEqual([]);

      expect(loggerLogSpy).toHaveBeenCalledWith('discoverySucceeded', {
        id: mockIntegrationId,
        toolCount: 0,
        resourceCount: 0,
        promptCount: 0,
      });
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.listTools).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = 'different-org-789';
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        differentOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.listTools).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationDisabledError when integration is disabled', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Disabled Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        false, // disabled
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationDisabledError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.listTools).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from query)', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue([]);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act
      await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      // Verify query does not contain orgId
      expect(query).not.toHaveProperty('orgId');
      expect(query).not.toHaveProperty('organizationId');
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const unexpectedError = new Error('Connection timeout');
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'listTools').mockRejectedValue(unexpectedError);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(UnexpectedMcpError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error discovering capabilities',
        { error: unexpectedError },
      );
    });

    it('should re-throw ApplicationError without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should re-throw UnauthorizedException without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log discovery operations and results', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([
        { name: 'tool1', inputSchema: { type: 'object' } },
        { name: 'tool2', inputSchema: { type: 'object' } },
      ]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([]);
      jest
        .spyOn(mcpClient, 'listPrompts')
        .mockResolvedValue([{ name: 'prompt1', arguments: [] }]);

      const query = new DiscoverMcpCapabilitiesQuery(mockIntegrationId);

      // Act
      await useCase.execute(query);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('discoverMcpCapabilities', {
        id: mockIntegrationId,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('discoverySucceeded', {
        id: mockIntegrationId,
        toolCount: 2,
        resourceCount: 0,
        promptCount: 1,
      });
    });
  });
});
