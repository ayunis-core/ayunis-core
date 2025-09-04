import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreatePermittedModelUseCase } from './create-permitted-model.use-case';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelRegistry } from '../../registry/model.registry';
import { IsProviderPermittedUseCase } from '../is-provider-permitted/is-provider-permitted.use-case';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ModelNotFoundError,
  ModelProviderNotPermittedError,
} from '../../models.errors';
import { UUID } from 'crypto';

describe('CreatePermittedModelUseCase', () => {
  let useCase: CreatePermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let modelRegistry: jest.Mocked<ModelRegistry>;
  let isProviderPermittedUseCase: jest.Mocked<IsProviderPermittedUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  beforeEach(async () => {
    const mockPermittedModelsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      findByOrgAndModel: jest.fn(),
    };

    const mockModelRegistry = {
      getAvailableModel: jest.fn(),
      getAllAvailableModels: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
    };

    const mockIsProviderPermittedUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePermittedModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: mockPermittedModelsRepository,
        },
        { provide: ModelRegistry, useValue: mockModelRegistry },
        {
          provide: IsProviderPermittedUseCase,
          useValue: mockIsProviderPermittedUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CreatePermittedModelUseCase>(
      CreatePermittedModelUseCase,
    );
    permittedModelsRepository = module.get(PermittedModelsRepository);
    modelRegistry = module.get(ModelRegistry);
    isProviderPermittedUseCase = module.get(IsProviderPermittedUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create permitted model successfully', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const mockModel = new LanguageModel({
        id: mockModelId,
        name: 'gpt-4',
        displayName: 'gpt-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
      });

      const mockPermittedModel = new PermittedModel({
        model: mockModel,
        orgId: mockOrgId,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);
      isProviderPermittedUseCase.execute.mockResolvedValue(true);
      permittedModelsRepository.create.mockResolvedValue(mockPermittedModel);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(modelRegistry.getAvailableModel).toHaveBeenCalledWith(mockModelId);
      expect(isProviderPermittedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          provider: 'openai',
        }),
      );
      expect(permittedModelsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          orgId: mockOrgId,
        }),
      );
      expect(result).toBe(mockPermittedModel);

      expect(logSpy).toHaveBeenCalledWith('execute', {
        modelId: mockModelId,
        orgId: mockOrgId,
      });
    });

    it('should throw ModelNotFoundError when model is not available', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const modelNotFoundError = new ModelNotFoundError(mockModelId);
      modelRegistry.getAvailableModel.mockImplementation(() => {
        throw modelNotFoundError;
      });

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ModelNotFoundError,
      );

      expect(modelRegistry.getAvailableModel).toHaveBeenCalledWith(mockModelId);
      expect(isProviderPermittedUseCase.execute).not.toHaveBeenCalled();
      expect(permittedModelsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ModelProviderNotPermittedError when provider is not permitted', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const mockModel = new LanguageModel({
        id: mockModelId,
        name: 'claude-3-sonnet',
        displayName: 'claude-3-sonnet',
        provider: ModelProvider.ANTHROPIC,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);
      isProviderPermittedUseCase.execute.mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ModelProviderNotPermittedError,
      );

      expect(modelRegistry.getAvailableModel).toHaveBeenCalledWith(mockModelId);
      expect(isProviderPermittedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          provider: 'anthropic',
        }),
      );
      expect(permittedModelsRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository creation errors', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const mockModel = new LanguageModel({
        id: mockModelId,
        name: 'gpt-4',
        displayName: 'gpt-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);
      isProviderPermittedUseCase.execute.mockResolvedValue(true);

      const repositoryError = new Error('Database constraint violation');
      permittedModelsRepository.create.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Database constraint violation',
      );

      expect(permittedModelsRepository.create).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error creating permitted model',
        repositoryError,
      );
    });

    it('should re-throw ModelNotFoundError without logging', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const modelNotFoundError = new ModelNotFoundError(mockModelId);
      modelRegistry.getAvailableModel.mockImplementation(() => {
        throw modelNotFoundError;
      });

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ModelNotFoundError,
      );

      // Should not log error for ModelNotFoundError as it's a business logic error
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle provider permission check errors', async () => {
      // Arrange
      const command = new CreatePermittedModelCommand(mockModelId, mockOrgId);

      const mockModel = new LanguageModel({
        id: mockModelId,
        name: 'gpt-4',
        displayName: 'gpt-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);

      const permissionError = new Error('Permission service unavailable');
      isProviderPermittedUseCase.execute.mockRejectedValue(permissionError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Permission service unavailable',
      );

      expect(isProviderPermittedUseCase.execute).toHaveBeenCalled();
      expect(permittedModelsRepository.create).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error creating permitted model',
        permissionError,
      );
    });
  });
});
