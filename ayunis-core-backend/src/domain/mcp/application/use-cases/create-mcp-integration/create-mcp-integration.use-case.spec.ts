import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CreateMcpIntegrationUseCase } from './create-mcp-integration.use-case';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';
import { PredefinedMcpIntegration } from '../../../domain/mcp-integration.entity';
import {
  InvalidPredefinedSlugError,
  UnexpectedMcpError,
} from '../../mcp.errors';

describe('CreateMcpIntegrationUseCase', () => {
  let useCase: CreateMcpIntegrationUseCase;
  let mockRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mockRegistryService: jest.Mocked<PredefinedMcpIntegrationRegistryService>;
  let mockContextService: jest.Mocked<ContextService>;

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
    } as any;

    mockRegistryService = {
      isValidSlug: jest.fn(),
    } as any;

    mockContextService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMcpIntegrationUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: mockRepository,
        },
        {
          provide: PredefinedMcpIntegrationRegistryService,
          useValue: mockRegistryService,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
      ],
    }).compile();

    useCase = module.get<CreateMcpIntegrationUseCase>(
      CreateMcpIntegrationUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully create predefined integration with auth', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'encrypted-credentials',
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);

      const savedIntegration = new PredefinedMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.slug,
        true,
        command.authMethod,
        command.authHeaderName,
        command.encryptedCredentials,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(savedIntegration);
      expect(mockContextService.get).toHaveBeenCalledWith('orgId');
      expect(mockRegistryService.isValidSlug).toHaveBeenCalledWith(
        command.slug,
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: command.name,
          slug: command.slug,
          organizationId: testOrgId,
          enabled: true,
          authMethod: command.authMethod,
          authHeaderName: command.authHeaderName,
          encryptedCredentials: command.encryptedCredentials,
        }),
      );
    });

    it('should successfully create predefined integration without auth', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration Without Auth',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);

      const savedIntegration = new PredefinedMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.slug,
        true,
        undefined,
        undefined,
        undefined,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(savedIntegration);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: command.name,
          slug: command.slug,
          organizationId: testOrgId,
          enabled: true,
          authMethod: undefined,
          authHeaderName: undefined,
          encryptedCredentials: undefined,
        }),
      );
    });

    it('should throw InvalidPredefinedSlugError for unknown slug', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidPredefinedSlugError,
      );
      expect(mockRegistryService.isValidSlug).toHaveBeenCalledWith(
        command.slug,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockContextService.get).toHaveBeenCalledWith('orgId');
      expect(mockRegistryService.isValidSlug).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService not from command', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);

      const savedIntegration = new PredefinedMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.slug,
        true,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockContextService.get).toHaveBeenCalledWith('orgId');
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: testOrgId,
        }),
      );
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);
      mockRepository.save.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
    });

    it('should re-throw ApplicationError without wrapping', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidPredefinedSlugError,
      );
    });

    it('should re-throw UnauthorizedException without wrapping', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should log operation start', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);

      const savedIntegration = new PredefinedMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.slug,
        true,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Spy on logger
      const logSpy = jest.spyOn(useCase['logger'], 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('createPredefinedIntegration', {
        slug: command.slug,
      });
    });

    it('should log errors', async () => {
      // Arrange
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Test Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRegistryService.isValidSlug.mockReturnValue(true);

      const error = new Error('Database connection error');
      (mockRepository.save as jest.Mock).mockRejectedValue(error);

      // Spy on logger
      const errorSpy = jest.spyOn(useCase['logger'], 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Unexpected error creating predefined integration',
        { error },
      );
    });
  });
});
