import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DeleteMcpIntegrationUseCase } from './delete-mcp-integration.use-case';
import { DeleteMcpIntegrationCommand } from './delete-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';

describe('DeleteMcpIntegrationUseCase', () => {
  let useCase: DeleteMcpIntegrationUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let userConfigRepository: McpIntegrationUserConfigRepositoryPort;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = randomUUID();
  const mockIntegrationId = randomUUID();

  const buildIntegration = (
    overrides: Partial<
      ConstructorParameters<typeof PredefinedMcpIntegration>[0]
    > = {},
  ) =>
    new PredefinedMcpIntegration({
      id: overrides.id ?? mockIntegrationId,
      name: overrides.name ?? 'Test Integration',
      orgId: overrides.orgId ?? mockOrgId,
      slug: overrides.slug ?? PredefinedMcpIntegrationSlug.TEST,
      serverUrl: overrides.serverUrl ?? 'https://registry.example.com/mcp',
      auth: overrides.auth ?? new NoAuthMcpIntegrationAuth(),
      enabled: overrides.enabled ?? true,
      connectionStatus: overrides.connectionStatus,
      lastConnectionError: overrides.lastConnectionError,
      lastConnectionCheck: overrides.lastConnectionCheck,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteMcpIntegrationUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: McpIntegrationUserConfigRepositoryPort,
          useValue: {
            deleteByIntegrationId: jest.fn(),
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

    useCase = module.get<DeleteMcpIntegrationUseCase>(
      DeleteMcpIntegrationUseCase,
    );
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
    );
    userConfigRepository = module.get<McpIntegrationUserConfigRepositoryPort>(
      McpIntegrationUserConfigRepositoryPort,
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
    it('should successfully delete integration when user has access', async () => {
      // Arrange
      const mockIntegration = buildIntegration();

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.delete).toHaveBeenCalledWith(mockIntegrationId);
      expect(loggerLogSpy).toHaveBeenCalledWith('deleteMcpIntegration', {
        id: mockIntegrationId,
      });
    });

    it('should delete associated user config records when deleting an integration', async () => {
      // Arrange
      const mockIntegration = buildIntegration();

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);
      jest
        .spyOn(userConfigRepository, 'deleteByIntegrationId')
        .mockResolvedValue(undefined);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(userConfigRepository.deleteByIntegrationId).toHaveBeenCalledWith(
        mockIntegrationId,
      );
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAccessDeniedError when integration belongs to different organization', async () => {
      // Arrange
      const differentOrgId = randomUUID();
      const mockIntegration = buildIntegration({ orgId: differentOrgId });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from command)', async () => {
      // Arrange
      const mockIntegration = buildIntegration();

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

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

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error deleting integration',
        { error: unexpectedError },
      );
    });

    it('should re-throw McpIntegrationNotFoundError without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should re-throw McpIntegrationAccessDeniedError without wrapping', async () => {
      // Arrange
      const mockIntegration = buildIntegration({ orgId: randomUUID() });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log operation start with integration id', async () => {
      // Arrange
      const mockIntegration = buildIntegration();

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      const command = new DeleteMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('deleteMcpIntegration', {
        id: mockIntegrationId,
      });
    });
  });
});
