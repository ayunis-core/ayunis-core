import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ListPredefinedMcpIntegrationConfigsUseCase } from './list-predefined-mcp-integration-configs.use-case';
import { ListPredefinedMcpIntegrationConfigsQuery } from './list-predefined-mcp-integration-configs.query';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';

describe('ListPredefinedMcpIntegrationConfigsUseCase', () => {
  let useCase: ListPredefinedMcpIntegrationConfigsUseCase;
  let registryService: PredefinedMcpIntegrationRegistry;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
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
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return list of predefined configs', () => {
      // Arrange
      const mockConfigs = [
        {
          slug: PredefinedMcpIntegrationSlug.TEST,
          displayName: 'Test MCP Server',
          description: 'Test integration',
          authType: McpAuthMethod.NO_AUTH,
        },
      ];
      jest.spyOn(registryService, 'getAllConfigs').mockReturnValue(mockConfigs);

      // Act
      const result = useCase.execute();

      // Assert
      expect(result).toEqual(mockConfigs);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(registryService.getAllConfigs).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
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
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(registryService.getAllConfigs).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
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
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error listing predefined configs',
        { error: unexpectedError },
      );
    });

    it('should log operation start', () => {
      // Arrange
      jest.spyOn(registryService, 'getAllConfigs').mockReturnValue([]);

      // Act
      useCase.execute();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'listPredefinedMcpIntegrationConfigs',
      );
    });

    it('should NOT require authentication (no ContextService)', () => {
      // This test verifies that the use case does not inject ContextService
      // by checking the constructor parameters
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const constructorParams: unknown[] =
        Reflect.getMetadata(
          'design:paramtypes',
          ListPredefinedMcpIntegrationConfigsUseCase,
        ) || [];

      // Should only have PredefinedMcpIntegrationRegistryService
      expect(constructorParams.length).toBe(1);
      expect(constructorParams[0]).toBe(PredefinedMcpIntegrationRegistry);
    });
  });
});
