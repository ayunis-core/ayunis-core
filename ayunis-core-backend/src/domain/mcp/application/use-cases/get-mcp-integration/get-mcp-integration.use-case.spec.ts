import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetMcpIntegrationUseCase } from './get-mcp-integration.use-case';
import { GetMcpIntegrationQuery } from './get-mcp-integration.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';

describe('GetMcpIntegrationUseCase', () => {
  let useCase: GetMcpIntegrationUseCase;
  let repository: McpIntegrationsRepositoryPort;
  let contextService: ContextService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = 'org-123' as UUID;
  const mockIntegrationId = 'integration-456' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMcpIntegrationUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
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

    useCase = module.get<GetMcpIntegrationUseCase>(GetMcpIntegrationUseCase);
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
    it('should successfully retrieve integration when user has access', async () => {
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

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual(mockIntegration);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
      expect(loggerLogSpy).toHaveBeenCalledWith('getMcpIntegration', {
        id: mockIntegrationId,
      });
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
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

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        McpIntegrationAccessDeniedError,
      );
      expect(repository.findById).toHaveBeenCalledWith(mockIntegrationId);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findById).not.toHaveBeenCalled();
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

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

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
      const unexpectedError = new Error('Database connection failed');
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockRejectedValue(unexpectedError);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(UnexpectedMcpError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error getting integration',
        { error: unexpectedError },
      );
    });

    it('should re-throw McpIntegrationNotFoundError without wrapping', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
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
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
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
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(contextService, 'get').mockReturnValue(mockOrgId);
      jest.spyOn(repository, 'findById').mockResolvedValue(mockIntegration);

      const query = new GetMcpIntegrationQuery(mockIntegrationId);

      // Act
      await useCase.execute(query);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('getMcpIntegration', {
        id: mockIntegrationId,
      });
    });
  });
});
