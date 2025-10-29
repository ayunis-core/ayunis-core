import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CreateMcpIntegrationUseCase } from './create-mcp-integration.use-case';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';
import { CustomMcpIntegration } from '../../../domain/mcp-integration.entity';
import { InvalidServerUrlError, UnexpectedMcpError } from '../../mcp.errors';

describe('CreateMcpIntegrationUseCase - Custom Integration', () => {
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

  describe('execute - Custom Integration', () => {
    it('should successfully create custom integration with auth', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'encrypted-credentials',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
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
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: command.name,
          serverUrl: command.serverUrl,
          organizationId: testOrgId,
          enabled: true,
          authMethod: command.authMethod,
          authHeaderName: command.authHeaderName,
          encryptedCredentials: command.encryptedCredentials,
          type: 'custom',
        }),
      );
    });

    it('should successfully create custom integration without auth', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration Without Auth',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
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
          serverUrl: command.serverUrl,
          organizationId: testOrgId,
          enabled: true,
          authMethod: undefined,
          authHeaderName: undefined,
          encryptedCredentials: undefined,
          type: 'custom',
        }),
      );
    });

    it('should throw InvalidServerUrlError for invalid URL', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'not-a-valid-url',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidServerUrlError,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockContextService.get).toHaveBeenCalledWith('orgId');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService not from command', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
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
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);
      mockRepository.save.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
    });

    it('should log operation start', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
        true,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Spy on logger
      const logSpy = jest.spyOn(useCase['logger'], 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('createCustomIntegration', {
        serverUrl: command.serverUrl,
      });
    });

    it('should log errors', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'My Custom Integration',
        'https://my-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const error = new Error('Database connection error');
      mockRepository.save.mockRejectedValue(error);

      // Spy on logger
      const errorSpy = jest.spyOn(useCase['logger'], 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Unexpected error creating custom integration',
        { error },
      );
    });

    it('should accept https URLs', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'HTTPS Integration',
        'https://secure-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
        true,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(savedIntegration);
    });

    it('should accept http URLs', async () => {
      // Arrange
      const command = new CreateCustomMcpIntegrationCommand(
        'HTTP Integration',
        'http://local-server.example.com',
      );

      mockContextService.get.mockReturnValue(testOrgId);

      const savedIntegration = new CustomMcpIntegration(
        'integration-id',
        command.name,
        testOrgId,
        command.serverUrl,
        true,
      );

      mockRepository.save.mockResolvedValue(savedIntegration);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(savedIntegration);
    });
  });
});
