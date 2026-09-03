import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListPredefinedMcpIntegrationConfigsUseCase } from './list-predefined-mcp-integration-configs.use-case';
import { PredefinedMcpIntegrationRegistry } from 'src/domain/mcp/application/registries/predefined-mcp-integration-registry.service';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { PredefinedMcpIntegrationConfig } from 'src/domain/mcp/domain/predefined-mcp-integration-config';

describe('ListPredefinedMcpIntegrationConfigsUseCase', () => {
  let logger: LoggerMock;
  let useCase: ListPredefinedMcpIntegrationConfigsUseCase;
  let registryService: PredefinedMcpIntegrationRegistry;

  beforeAll(async () => {
    logger = createLoggerMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPredefinedMcpIntegrationConfigsUseCase,
        {
          provide: PredefinedMcpIntegrationRegistry,
          useValue: {
            getAllConfigs: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ListPredefinedMcpIntegrationConfigsUseCase>(
      ListPredefinedMcpIntegrationConfigsUseCase,
    );
    registryService = module.get<PredefinedMcpIntegrationRegistry>(
      PredefinedMcpIntegrationRegistry,
    );

    // Spy on logger methods
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return list of predefined configs', () => {
      // Arrange
      const mockConfigs = [
        new PredefinedMcpIntegrationConfig({
          slug: PredefinedMcpIntegrationSlug.TEST,
          displayName: 'Test MCP Server',
          description: 'Test integration',
          serverUrl: 'https://registry.example.com/mcp',
          authType: McpAuthMethod.NO_AUTH,
        }),
      ];
      jest.spyOn(registryService, 'getAllConfigs').mockReturnValue(mockConfigs);

      // Act
      const result = useCase.execute();

      // Assert
      expect(result).toEqual(mockConfigs);

      expect(registryService.getAllConfigs).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        'listPredefinedMcpIntegrationConfigs',
      );
    });

    it('should return empty array when registry has no configs', () => {
      // Arrange
      jest.spyOn(registryService, 'getAllConfigs').mockReturnValue([]);

      // Act
      const result = useCase.execute();

      // Assert
      expect(result).toEqual([]);

      expect(registryService.getAllConfigs).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        'listPredefinedMcpIntegrationConfigs',
      );
    });

    it('should wrap unexpected errors in UnexpectedMcpError', () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      jest.spyOn(registryService, 'getAllConfigs').mockImplementation(() => {
        throw unexpectedError;
      });

      // Act & Assert
      expect(() => useCase.execute()).toThrow(UnexpectedMcpError);
      expect(logger.error).toHaveBeenCalledWith(
        { err: unexpectedError },
        'Unexpected error listing predefined configs',
      );
    });

    it('should log operation start', () => {
      // Arrange
      jest.spyOn(registryService, 'getAllConfigs').mockReturnValue([]);

      // Act
      useCase.execute();

      // Assert
      expect(logger.log).toHaveBeenCalledWith(
        'listPredefinedMcpIntegrationConfigs',
      );
    });

    it('should NOT require authentication (no ContextService)', () => {
      // This test verifies that the use case does not inject ContextService
      // by checking the constructor parameters

      const constructorParams: unknown[] =
        Reflect.getMetadata(
          'design:paramtypes',
          ListPredefinedMcpIntegrationConfigsUseCase,
        ) ?? [];

      expect(constructorParams).toEqual([PredefinedMcpIntegrationRegistry]);
    });
  });
});
