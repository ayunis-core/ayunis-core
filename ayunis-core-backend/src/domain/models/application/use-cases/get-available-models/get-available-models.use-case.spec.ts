import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAvailableModelsUseCase } from './get-available-models.use-case';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { ModelRegistry } from '../../registry/model.registry';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

describe('GetAvailableModelsUseCase', () => {
  let useCase: GetAvailableModelsUseCase;
  let modelRegistry: jest.Mocked<ModelRegistry>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeEach(async () => {
    const mockModelRegistry = {
      getAllAvailableModels: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailableModelsUseCase,
        { provide: ModelRegistry, useValue: mockModelRegistry },
      ],
    }).compile();

    useCase = module.get<GetAvailableModelsUseCase>(GetAvailableModelsUseCase);
    modelRegistry = module.get(ModelRegistry);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all available models from registry', () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as any,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174002' as any,
          name: 'claude-3-sonnet',
          displayName: 'claude-3-sonnet',
          provider: ModelProvider.ANTHROPIC,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      ];

      modelRegistry.getAllAvailableModels.mockReturnValue(mockModels);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(modelRegistry.getAllAvailableModels).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockModels);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no models are available', () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      modelRegistry.getAllAvailableModels.mockReturnValue([]);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(modelRegistry.getAllAvailableModels).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should log the query details', () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as any,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      ];

      modelRegistry.getAllAvailableModels.mockReturnValue(mockModels);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('getAvailableModels', query);
    });

    it('should log debug information about all models', () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as any,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      ];

      modelRegistry.getAllAvailableModels.mockReturnValue(mockModels);

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      useCase.execute(query);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith('All available models', {
        allModels: mockModels,
      });
    });
  });
});
