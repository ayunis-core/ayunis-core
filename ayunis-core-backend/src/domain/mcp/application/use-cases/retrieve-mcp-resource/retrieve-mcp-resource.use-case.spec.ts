import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { RetrieveMcpResourceUseCase } from './retrieve-mcp-resource.use-case';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientPort } from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
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
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';

describe('RetrieveMcpResourceUseCase', () => {
  let useCase: RetrieveMcpResourceUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let mcpClient: McpClientPort;
  let credentialEncryption: McpCredentialEncryptionPort;
  let registryService: PredefinedMcpIntegrationRegistry;
  let contextService: ContextService;
  let createDataSourceUseCase: CreateDataSourceUseCase;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;
  const mockResourceUri = 'dataset://sales-data.csv';
  const mockCsvContent = 'name,age,city\nJohn,30,NYC\nJane,25,LA';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveMcpResourceUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientPort,
          useValue: {
            readResource: jest.fn(),
          },
        },
        {
          provide: McpCredentialEncryptionPort,
          useValue: {
            decrypt: jest.fn(),
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
        {
          provide: CreateDataSourceUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<RetrieveMcpResourceUseCase>(
      RetrieveMcpResourceUseCase,
    );
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
    );
    mcpClient = module.get<McpClientPort>(McpClientPort);
    credentialEncryption = module.get<McpCredentialEncryptionPort>(
      McpCredentialEncryptionPort,
    );
    registryService = module.get<PredefinedMcpIntegrationRegistry>(
      PredefinedMcpIntegrationRegistry,
    );
    contextService = module.get<ContextService>(ContextService);
    createDataSourceUseCase = module.get<CreateDataSourceUseCase>(
      CreateDataSourceUseCase,
    );

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully retrieve CSV resource and create data source', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockCsvContent,
        mimeType: 'text/csv',
      });
      jest
        .spyOn(createDataSourceUseCase, 'execute')
        .mockResolvedValue({} as any);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:3100/mcp',
        }),
        mockResourceUri,
        undefined,
      );

      // Verify CreateDataSourceUseCase was called with correct parameters
      expect(createDataSourceUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining(mockResourceUri),
          data: {
            headers: ['name', 'age', 'city'],
            rows: [
              ['John', '30', 'NYC'],
              ['Jane', '25', 'LA'],
            ],
          },
          createdBy: SourceCreator.SYSTEM,
        }),
      );

      expect(loggerLogSpy).toHaveBeenCalledWith('retrieveMcpResource', {
        id: mockIntegrationId,
        uri: mockResourceUri,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('resourceRetrieved', {
        id: mockIntegrationId,
        uri: mockResourceUri,
        mimeType: 'text/csv',
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('handlingCsvResource', {
        uri: mockResourceUri,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('csvResourceImported', {
        uri: mockResourceUri,
      });
    });

    it('should successfully retrieve non-CSV resource without creating data source', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      const mockTextContent = 'Some text content';

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockTextContent,
        mimeType: 'text/plain',
      });

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        'resource://text-file.txt',
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:3100/mcp',
        }),
        'resource://text-file.txt',
        undefined,
      );

      // Should NOT call CreateDataSourceUseCase for non-CSV
      expect(createDataSourceUseCase.execute).not.toHaveBeenCalled();

      expect(loggerLogSpy).toHaveBeenCalledWith('resourceRetrieved', {
        id: mockIntegrationId,
        uri: 'resource://text-file.txt',
        mimeType: 'text/plain',
      });
    });

    it('should handle parameterized resource URIs correctly', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration(
        mockIntegrationId,
        'Custom Integration',
        mockOrgId,
        'http://custom-server.com/mcp',
        true,
      );

      const mockParameters = { category: 'electronics', year: 2024 };

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockCsvContent,
        mimeType: 'text/csv',
      });
      jest
        .spyOn(createDataSourceUseCase, 'execute')
        .mockResolvedValue({} as any);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        'dataset://items?category={category}&year={year}',
        mockParameters,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://custom-server.com/mcp',
        }),
        'dataset://items?category={category}&year={year}',
        mockParameters,
      );
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.readResource).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = 'different-org-789';
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: differentOrgId, // Different org
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.readResource).not.toHaveBeenCalled();
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

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationDisabledError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(mcpClient.readResource).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(mcpClient.readResource).not.toHaveBeenCalled();
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

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockCsvContent,
        mimeType: 'text/csv',
      });
      jest
        .spyOn(createDataSourceUseCase, 'execute')
        .mockResolvedValue({} as any);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
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

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error retrieving resource',
        { error: unexpectedError },
      );
    });

    it('should log resource retrievals and operations', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockCsvContent,
        mimeType: 'text/csv',
      });
      jest
        .spyOn(createDataSourceUseCase, 'execute')
        .mockResolvedValue({} as any);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('retrieveMcpResource', {
        id: mockIntegrationId,
        uri: mockResourceUri,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('resourceRetrieved', {
        id: mockIntegrationId,
        uri: mockResourceUri,
        mimeType: 'text/csv',
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('handlingCsvResource', {
        uri: mockResourceUri,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith('csvResourceImported', {
        uri: mockResourceUri,
      });
    });

    it('should build connection config with authentication for predefined integration', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'encrypted-token',
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest
        .spyOn(credentialEncryption, 'decrypt')
        .mockResolvedValue('decrypted-token');
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: 'test content',
        mimeType: 'text/plain',
      });

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(credentialEncryption.decrypt).toHaveBeenCalledWith(
        'encrypted-token',
      );
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:3100/mcp',
          authHeaderName: 'Authorization',
          authToken: 'decrypted-token',
        }),
        mockResourceUri,
        undefined,
      );
    });

    it('should build connection config with authentication for custom integration', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration(
        mockIntegrationId,
        'Custom Integration',
        mockOrgId,
        'http://custom-server.com/mcp',
        true,
        McpAuthMethod.BEARER_TOKEN,
        'X-API-Key',
        'encrypted-key',
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest
        .spyOn(credentialEncryption, 'decrypt')
        .mockResolvedValue('decrypted-key');
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: 'test content',
        mimeType: 'text/plain',
      });

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(credentialEncryption.decrypt).toHaveBeenCalledWith(
        'encrypted-key',
      );
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://custom-server.com/mcp',
          authHeaderName: 'X-API-Key',
          authToken: 'decrypted-key',
        }),
        mockResourceUri,
        undefined,
      );
    });

    it('should build connection config without authentication when not configured', async () => {
      // Arrange
      const mockIntegration = new CustomMcpIntegration(
        mockIntegrationId,
        'Custom Integration',
        mockOrgId,
        'http://custom-server.com/mcp',
        true,
        undefined, // No auth
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: 'test content',
        mimeType: 'text/plain',
      });

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(mcpClient.readResource).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://custom-server.com/mcp',
        }),
        mockResourceUri,
        undefined,
      );
      // Should not have auth fields
      const callArgs = (mcpClient.readResource as jest.Mock).mock
        .calls[0][0] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('authHeaderName');
      expect(callArgs).not.toHaveProperty('authToken');
    });

    it('should pass createdBy as SYSTEM when creating CSV data source', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        organizationId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(registryService, 'getConfig').mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test',
        description: 'Test',
        authType: McpAuthMethod.NO_AUTH,
      });
      jest.spyOn(mcpClient, 'readResource').mockResolvedValue({
        content: mockCsvContent,
        mimeType: 'text/csv',
      });

      const executeSpy = jest
        .spyOn(createDataSourceUseCase, 'execute')
        .mockResolvedValue({} as any);

      const command = new RetrieveMcpResourceCommand(
        mockIntegrationId,
        mockResourceUri,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(executeSpy).toHaveBeenCalledTimes(1);
      const commandArg = executeSpy.mock
        .calls[0][0] as CreateCSVDataSourceCommand;
      expect(commandArg).toBeInstanceOf(CreateCSVDataSourceCommand);
      expect(commandArg.createdBy).toBe(SourceCreator.SYSTEM);
    });
  });
});
