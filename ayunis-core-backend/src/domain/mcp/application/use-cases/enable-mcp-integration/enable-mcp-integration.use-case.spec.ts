import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { EnableMcpIntegrationUseCase } from './enable-mcp-integration.use-case';
import { EnableMcpIntegrationCommand } from './enable-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpUnauthenticatedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';

describe('EnableMcpIntegrationUseCase', () => {
  let useCase: EnableMcpIntegrationUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnableMcpIntegrationUseCase,
        ValidateIntegrationAccessService,
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

    useCase = module.get<EnableMcpIntegrationUseCase>(
      EnableMcpIntegrationUseCase,
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
    it('should successfully enable integration when user has access', async () => {
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

      const enabledIntegration = new PredefinedMcpIntegration({
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
      jest.spyOn(repository, 'save').mockResolvedValue(enabledIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual(enabledIntegration);
      expect(result.enabled).toBe(true);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith('enableMcpIntegration', {
        id: mockIntegrationId,
      });
    });

    it('should be idempotent - enabling already-enabled integration succeeds', async () => {
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

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toEqual(mockIntegration);
      expect(result.enabled).toBe(true);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).not.toHaveBeenCalled();
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
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw McpUnauthenticatedError when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpUnauthenticatedError,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from command)', async () => {
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
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

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

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error enabling integration',
        { error: unexpectedError },
      );
    });

    it('should re-throw McpIntegrationNotFoundError without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should re-throw McpIntegrationAccessDeniedError without wrapping', async () => {
      // Arrange
      const mockIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Test Integration',
        orgId: 'different-org' as UUID,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3100/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      // Should not log as unexpected error
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log operation start with integration id', async () => {
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
      jest.spyOn(repository, 'save').mockResolvedValue(mockIntegration);

      const command = new EnableMcpIntegrationCommand(mockIntegrationId);

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('enableMcpIntegration', {
        id: mockIntegrationId,
      });
    });
  });
});
