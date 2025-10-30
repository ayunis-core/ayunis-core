import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { ExecuteMcpToolUseCase } from './execute-mcp-tool.use-case';
import { ExecuteMcpToolCommand } from './execute-mcp-tool.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientPort, McpToolResult } from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
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

describe('ExecuteMcpToolUseCase', () => {
  let useCase: ExecuteMcpToolUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let mcpClient: McpClientPort;
  let credentialEncryption: McpCredentialEncryptionPort;
  let registryService: PredefinedMcpIntegrationRegistryService;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;
  const mockToolName = 'test-tool';
  const mockParameters = { param1: 'value1', param2: 42 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteMcpToolUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientPort,
          useValue: {
            callTool: jest.fn(),
          },
        },
        {
          provide: McpCredentialEncryptionPort,
          useValue: {
            decrypt: jest.fn(),
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

    useCase = module.get<ExecuteMcpToolUseCase>(ExecuteMcpToolUseCase);
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
    );
    mcpClient = module.get<McpClientPort>(McpClientPort);
    credentialEncryption = module.get<McpCredentialEncryptionPort>(
      McpCredentialEncryptionPort,
    );
    registryService = module.get<PredefinedMcpIntegrationRegistryService>(
      PredefinedMcpIntegrationRegistryService,
    );
    contextService = module.get<ContextService>(ContextService);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully execute tool and return result', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success', data: 'test-data' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isError: false,
        content: mockToolResult.content,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:3100/mcp',
        }),
        expect.objectContaining({
          toolName: mockToolName,
          parameters: mockParameters,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('executeMcpTool', {
        id: mockIntegrationId,
        tool: mockToolName,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('toolExecutionSucceeded', {
        id: mockIntegrationId,
        tool: mockToolName,
      });
    });

    it('should return error result when tool execution fails on MCP server', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const toolError = new Error('Tool execution failed');

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'callTool').mockRejectedValue(toolError);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isError: true,
        content: null,
        errorMessage: 'Tool execution failed',
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith('toolExecutionFailed', {
        id: mockIntegrationId,
        tool: mockToolName,
        error: toolError,
      });
      // Should NOT throw
    });

    it('should return error result when tool does not exist on MCP server', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const toolError = new Error('Tool not found: unknown-tool');

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'callTool').mockRejectedValue(toolError);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        'unknown-tool',
        mockParameters,
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isError: true,
        content: null,
        errorMessage: 'Tool not found: unknown-tool',
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith('toolExecutionFailed', {
        id: mockIntegrationId,
        tool: 'unknown-tool',
        error: toolError,
      });
      // Should NOT throw
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = 'different-org-789';
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: differentOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationDisabledError when integration is disabled', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: false, // Disabled
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationDisabledError,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findById).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from command)', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      // Verify command does not contain orgId
      expect(command).not.toHaveProperty('orgId');
      expect(command).not.toHaveProperty('organizationId');
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockRejectedValue(unexpectedError);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error executing tool',
        { error: unexpectedError },
      );
    });

    it('should log tool executions and results', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
      });
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('executeMcpTool', {
        id: mockIntegrationId,
        tool: mockToolName,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('toolExecutionSucceeded', {
        id: mockIntegrationId,
        tool: mockToolName,
      });
    });

    it('should build connection config with authentication for predefined integration', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: 'encrypted-token',
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        url: 'http://localhost:3100/mcp',
        defaultAuthMethod: McpAuthMethod.BEARER_TOKEN,
        defaultAuthHeaderName: 'Authorization',
      });
      jest
        .spyOn(credentialEncryption, 'decrypt')
        .mockResolvedValue('decrypted-token');
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(credentialEncryption.decrypt).toHaveBeenCalledWith(
        'encrypted-token',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:3100/mcp',
          authHeaderName: 'Authorization',
          authToken: 'decrypted-token',
        }),
        expect.any(Object),
      );
    });

    it('should build connection config with authentication for custom integration', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration({
        id: mockIntegrationId,
        name: 'Custom Integration',
        organizationId: mockOrgId,
        serverUrl: 'http://custom-server.com/mcp',
        enabled: true,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: 'encrypted-key',
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest
        .spyOn(credentialEncryption, 'decrypt')
        .mockResolvedValue('decrypted-key');
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(credentialEncryption.decrypt).toHaveBeenCalledWith(
        'encrypted-key',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://custom-server.com/mcp',
          authHeaderName: 'X-API-Key',
          authToken: 'decrypted-key',
        }),
        expect.any(Object),
      );
    });

    it('should build connection config without authentication when not configured', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration({
        id: mockIntegrationId,
        name: 'Custom Integration',
        organizationId: mockOrgId,
        serverUrl: 'http://custom-server.com/mcp',
        enabled: true,
        authMethod: undefined, // No auth
        authHeaderName: undefined,
        encryptedCredentials: undefined,
      });

      const mockToolResult: McpToolResult = {
        isError: false,
        content: { result: 'success' },
      };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'callTool').mockResolvedValue(mockToolResult);

      const command = new ExecuteMcpToolCommand(
        mockIntegrationId,
        mockToolName,
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://custom-server.com/mcp',
        }),
        expect.any(Object),
      );
      // Should not have auth fields
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const callArgs = (mcpClient.callTool as jest.Mock).mock
        .calls[0][0] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('authHeaderName');
      expect(callArgs).not.toHaveProperty('authToken');
    });
  });
});
