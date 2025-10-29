import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { DisableMcpIntegrationUseCase } from './disable-mcp-integration.use-case';
import { DisableMcpIntegrationCommand } from './disable-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';

describe('DisableMcpIntegrationUseCase', () => {
  let useCase: DisableMcpIntegrationUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisableMcpIntegrationUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
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

    useCase = module.get<DisableMcpIntegrationUseCase>(
      DisableMcpIntegrationUseCase,
    );
    repository = module.get<McpIntegrationsRepositoryPort>(
      McpIntegrationsRepositoryPort,
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
    it('should successfully disable integration when user has access', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true, // Initially enabled
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      const disabledIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        false, // Now disabled
        undefined,
        undefined,
        undefined,
        mockIntegration.createdAt,
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'save').mockResolvedValue(disabledIntegration);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.enabled).toBe(false);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).toHaveBeenCalledWith(mockIntegration);
      expect(loggerLogSpy).toHaveBeenCalledWith('disableMcpIntegration', {
        id: mockIntegrationId,
      });
    });

    it('should be idempotent - disabling already-disabled integration succeeds', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration(
        mockIntegrationId,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        false, // Already disabled
        undefined,
        undefined,
        undefined,
        new Date(),
        new Date(),
      );

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.enabled).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(mockIntegration);
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).not.toHaveBeenCalled();
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

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
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
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

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

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error disabling integration',
        { error: unexpectedError },
      );
    });

    it('should re-throw ApplicationError without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log operation start with integration id', async () => {
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
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new DisableMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('disableMcpIntegration', {
        id: mockIntegrationId,
      });
    });
  });
});
