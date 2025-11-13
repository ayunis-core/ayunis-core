import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { GetMcpPromptUseCase } from './get-mcp-prompt.use-case';
import { GetMcpPromptQuery } from './get-mcp-prompt.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientPort } from '../../ports/mcp-client.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
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
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';

describe('GetMcpPromptUseCase', () => {
  let useCase: GetMcpPromptUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let mcpClient: McpClientPort;
  let registryService: PredefinedMcpIntegrationRegistry;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;
  const mockPromptName = 'test-prompt';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMcpPromptUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientPort,
          useValue: {
            getPrompt: jest.fn(),
          },
        },
        {
          provide: PredefinedMcpIntegrationRegistry,
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

    useCase = module.get<GetMcpPromptUseCase>(GetMcpPromptUseCase);
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
    );
    mcpClient = module.get<McpClientPort>(McpClientPort);
    registryService = module.get<PredefinedMcpIntegrationRegistry>(
      PredefinedMcpIntegrationRegistry,
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
    it('should successfully retrieve prompt with arguments from predefined integration', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockArguments = { arg1: 'value1', arg2: 'value2' };
      const mockPromptResponse = {
        messages: [
          { role: 'user', content: { text: 'Hello' } },
          { role: 'assistant', content: { text: 'Hi there' } },
        ],
        description: 'Test prompt description',
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        serverUrl: 'http://localhost:3100/mcp',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'getPrompt').mockResolvedValue(mockPromptResponse);

      const query = new GetMcpPromptQuery(
        mockIntegrationId,
        mockPromptName,
        mockArguments,
      );

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
        description: 'Test prompt description',
      });
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.getPrompt).toHaveBeenCalledWith(
        {
          serverUrl: 'http://localhost:3100/mcp',
        },
        mockPromptName,
        mockArguments,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('getMcpPrompt', {
        id: mockIntegrationId,
        prompt: mockPromptName,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('promptRetrieved', {
        id: mockIntegrationId,
        prompt: mockPromptName,
        messageCount: 2,
      });
    });

    it('should successfully retrieve prompt without arguments', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration({
        id: mockIntegrationId,
        name: 'Custom Integration',
        orgId: mockOrgId,
        serverUrl: 'http://custom-server.com/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPromptResponse = {
        messages: [{ role: 'user', content: { text: 'Hello' } }],
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'getPrompt').mockResolvedValue(mockPromptResponse);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual({
        messages: [{ role: 'user', content: 'Hello' }],
        description: undefined,
      });
      expect(mcpClient.getPrompt).toHaveBeenCalledWith(
        {
          serverUrl: 'http://custom-server.com/mcp',
        },
        mockPromptName,
        {},
      );
    });

    it('should handle prompt with authentication from custom integration', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration({
        id: mockIntegrationId,
        name: 'Custom Integration',
        orgId: mockOrgId,
        serverUrl: 'http://custom-server.com/mcp',
        auth: new BearerMcpIntegrationAuth({
          authToken: 'encrypted-token-123',
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPromptResponse = {
        messages: [{ role: 'user', content: { text: 'Hello' } }],
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'getPrompt').mockResolvedValue(mockPromptResponse);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act
      await useCase.execute(query);

      // Assert
      expect(mcpClient.getPrompt).toHaveBeenCalledWith(
        {
          serverUrl: 'http://custom-server.com/mcp',
          authHeaderName: 'Authorization',
          authToken: 'encrypted-token-123',
        },
        mockPromptName,
        {},
      );
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.getPrompt).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = 'different-org-789' as UUID;
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: differentOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.getPrompt).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationDisabledError when integration is disabled', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationDisabledError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.getPrompt).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(mcpClient.getPrompt).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from query)', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPromptResponse = {
        messages: [{ role: 'user', content: { text: 'Hello' } }],
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        serverUrl: 'http://localhost:3100/mcp',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'getPrompt').mockResolvedValue(mockPromptResponse);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

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
      const unexpectedError = new Error('MCP server connection failed');
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        serverUrl: 'http://localhost:3100/mcp',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'getPrompt').mockRejectedValue(unexpectedError);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(UnexpectedMcpError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error getting prompt',
        { error: unexpectedError },
      );
    });

    it('should log prompt retrieval start and completion', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPromptResponse = {
        messages: [
          { role: 'user', content: { text: 'Hello' } },
          { role: 'assistant', content: { text: 'Hi' } },
          { role: 'user', content: { text: 'How are you?' } },
        ],
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test Server',
        description: 'Test',
        serverUrl: 'http://localhost:3100/mcp',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'getPrompt').mockResolvedValue(mockPromptResponse);

      const query = new GetMcpPromptQuery(mockIntegrationId, mockPromptName);

      // Act
      await useCase.execute(query);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('getMcpPrompt', {
        id: mockIntegrationId,
        prompt: mockPromptName,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('promptRetrieved', {
        id: mockIntegrationId,
        prompt: mockPromptName,
        messageCount: 3,
      });
    });
  });
});
