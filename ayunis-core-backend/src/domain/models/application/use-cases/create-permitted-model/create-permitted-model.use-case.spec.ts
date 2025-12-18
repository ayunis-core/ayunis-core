import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreatePermittedModelUseCase } from './create-permitted-model.use-case';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelRegistry } from '../../registry/model.registry';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelNotFoundError } from '../../models.errors';
import { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe('CreatePermittedModelUseCase', () => {
  let useCase: CreatePermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let modelRegistry: jest.Mocked<ModelRegistry>;
  let mockContextService: any;

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

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePermittedModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: mockPermittedModelsRepository,
        },
        { provide: ModelRegistry, useValue: mockModelRegistry },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreatePermittedModelUseCase>(
      CreatePermittedModelUseCase,
    );
    permittedModelsRepository = module.get(PermittedModelsRepository);
    modelRegistry = module.get(ModelRegistry);

    // Configure ContextService mock
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'orgId') return mockOrgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return null;
      return null;
    });

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
        canVision: false,
      });

      const mockPermittedModel = new PermittedModel({
        model: mockModel,
        orgId: mockOrgId,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);
      permittedModelsRepository.create.mockResolvedValue(mockPermittedModel);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(modelRegistry.getAvailableModel).toHaveBeenCalledWith(mockModelId);
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
        canVision: false,
      });

      modelRegistry.getAvailableModel.mockReturnValue(mockModel);

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
  });
});
