import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UpdateLanguageModelUseCase } from './update-language-model.use-case';
import { UpdateLanguageModelCommand } from './update-language-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { ClearDefaultsByCatalogModelIdUseCase } from '../clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelNotFoundByIdError } from '../../models.errors';
import type { UUID } from 'crypto';

describe('UpdateLanguageModelUseCase', () => {
  let useCase: UpdateLanguageModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let clearDefaultsUseCase: jest.Mocked<ClearDefaultsByCatalogModelIdUseCase>;

  const mockModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  beforeEach(async () => {
    const mockModelsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      delete: jest.fn(),
    };

    const mockClearDefaultsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLanguageModelUseCase,
        { provide: ModelsRepository, useValue: mockModelsRepository },
        {
          provide: ClearDefaultsByCatalogModelIdUseCase,
          useValue: mockClearDefaultsUseCase,
        },
      ],
    }).compile();

    useCase = module.get<UpdateLanguageModelUseCase>(
      UpdateLanguageModelUseCase,
    );
    modelsRepository = module.get(ModelsRepository);
    clearDefaultsUseCase = module.get(ClearDefaultsByCatalogModelIdUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockLanguageModel = (
    id: UUID,
    isArchived: boolean,
  ): LanguageModel => {
    return new LanguageModel({
      id,
      name: 'gpt-4',
      displayName: 'GPT-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived,
      canUseTools: true,
      canVision: false,
    });
  };

  const createUpdateCommand = (
    id: UUID,
    isArchived: boolean,
  ): UpdateLanguageModelCommand => {
    return new UpdateLanguageModelCommand({
      id,
      name: 'gpt-4',
      displayName: 'GPT-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived,
      canUseTools: true,
      canVision: false,
    });
  };

  describe('execute', () => {
    it('should call clearDefaultsUseCase when isArchived changes from false to true', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, true);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();
      clearDefaultsUseCase.execute.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(clearDefaultsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(clearDefaultsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          catalogModelId: mockModelId,
        }),
      );
    });

    it('should NOT call clearDefaultsUseCase when model was already archived', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, true);
      const command = createUpdateCommand(mockModelId, true);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(clearDefaultsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should NOT call clearDefaultsUseCase when unarchiving (true -> false)', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, true);
      const command = createUpdateCommand(mockModelId, false);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(clearDefaultsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should NOT call clearDefaultsUseCase when isArchived remains false', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, false);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(clearDefaultsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should save the model before clearing defaults', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, true);

      const callOrder: string[] = [];

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockImplementation(async () => {
        callOrder.push('save');
      });
      clearDefaultsUseCase.execute.mockImplementation(async () => {
        callOrder.push('clearDefaults');
      });

      // Act
      await useCase.execute(command);

      // Assert
      expect(callOrder).toEqual(['save', 'clearDefaults']);
    });

    it('should throw ModelNotFoundByIdError when model does not exist', async () => {
      // Arrange
      const command = createUpdateCommand(mockModelId, true);

      modelsRepository.findOne.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ModelNotFoundByIdError,
      );
      expect(modelsRepository.save).not.toHaveBeenCalled();
      expect(clearDefaultsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return the updated model', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, true);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();
      clearDefaultsUseCase.execute.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeInstanceOf(LanguageModel);
      expect(result.id).toBe(mockModelId);
      expect(result.isArchived).toBe(true);
    });

    it('should log when model is being archived', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, true);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();
      clearDefaultsUseCase.execute.mockResolvedValue();

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Model is being archived, clearing defaults',
        { modelId: mockModelId },
      );
    });

    it('should not log archival message when model is not being archived', async () => {
      // Arrange
      const existingModel = createMockLanguageModel(mockModelId, false);
      const command = createUpdateCommand(mockModelId, false);

      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.save.mockResolvedValue();

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).not.toHaveBeenCalledWith(
        'Model is being archived, clearing defaults',
        expect.anything(),
      );
    });
  });
});
