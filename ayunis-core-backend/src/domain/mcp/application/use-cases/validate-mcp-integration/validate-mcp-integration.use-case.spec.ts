import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { ValidateMcpIntegrationUseCase } from './validate-mcp-integration.use-case';
import { ValidateMcpIntegrationCommand } from './validate-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientPort } from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

describe('ValidateMcpIntegrationUseCase', () => {
  let useCase: ValidateMcpIntegrationUseCase;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateMcpIntegrationUseCase,
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

    useCase = module.get<ValidateMcpIntegrationUseCase>(
      ValidateMcpIntegrationUseCase,
    );
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
    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = 'different-org-789';
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        differentOrgId, // Different org
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

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
    });

    it('should successfully validate integration with working MCP server', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'encrypted-credentials',
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest
        .spyOn(credentialEncryption, 'decrypt')
        .mockResolvedValue('decrypted-token');
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test integration',
        url: 'http://localhost:3000/mcp',
        defaultAuthMethod: McpAuthMethod.API_KEY,
        defaultAuthHeaderName: 'X-API-Key',
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: { type: 'object' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: { type: 'object' },
        },
      ]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([
        {
          uri: 'resource1',
          name: 'Resource 1',
        },
      ]);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue([
        {
          name: 'prompt1',
          description: 'Prompt 1',
        },
        {
          name: 'prompt2',
          description: 'Prompt 2',
        },
        {
          name: 'prompt3',
          description: 'Prompt 3',
        },
      ]);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isValid: true,
        toolCount: 2,
        resourceCount: 1,
        promptCount: 3,
      });
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.listTools).toHaveBeenCalled();
      expect(mcpClient.listResources).toHaveBeenCalled();
      expect(mcpClient.listPrompts).toHaveBeenCalled();
    });

    it('should return failure result when MCP server is unreachable', async () => {
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

      const connectionError = new Error('Connection refused');

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test integration',
        url: 'http://localhost:3000/mcp',
        defaultAuthMethod: undefined,
        defaultAuthHeaderName: undefined,
      });
      jest.spyOn(mcpClient, 'listTools').mockRejectedValue(connectionError);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Connection refused',
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith('validationFailed', {
        id: mockIntegrationId,
        error: connectionError,
      });
    });

    it('should return failure result when authentication fails', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'encrypted-wrong-token',
        new Date(),
        new Date(),
      );

      const authError = new Error('Unauthorized: Invalid token');

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test integration',
        url: 'http://localhost:3000/mcp',
        defaultAuthMethod: McpAuthMethod.API_KEY,
        defaultAuthHeaderName: 'X-API-Key',
      });
      jest.spyOn(mcpClient, 'listTools').mockRejectedValue(authError);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Unauthorized: Invalid token',
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith('validationFailed', {
        id: mockIntegrationId,
        error: authError,
      });
    });

    it('should use organizationId from ContextService (not from command)', async () => {
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
        displayName: 'Test',
        description: 'Test integration',
        url: 'http://localhost:3000/mcp',
        defaultAuthMethod: undefined,
        defaultAuthHeaderName: undefined,
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue([]);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      // Verify command does not contain orgId
      expect(command).not.toHaveProperty('orgId');
      expect(command).not.toHaveProperty('organizationId');
    });

    it('should log validation attempts and results', async () => {
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
        displayName: 'Test',
        description: 'Test integration',
        url: 'http://localhost:3000/mcp',
        defaultAuthMethod: undefined,
        defaultAuthHeaderName: undefined,
      });
      jest.spyOn(mcpClient, 'listTools').mockResolvedValue([
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: { type: 'object' },
        },
      ]);
      jest.spyOn(mcpClient, 'listResources').mockResolvedValue([]);
      jest.spyOn(mcpClient, 'listPrompts').mockResolvedValue([]);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('validateMcpIntegration', {
        id: mockIntegrationId,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('validationSucceeded', {
        id: mockIntegrationId,
        toolCount: 1,
        resourceCount: 0,
        promptCount: 0,
      });
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockRejectedValue(unexpectedError);

      const command = new ValidateMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error validating integration',
        { error: unexpectedError },
      );
    });
  });
});
