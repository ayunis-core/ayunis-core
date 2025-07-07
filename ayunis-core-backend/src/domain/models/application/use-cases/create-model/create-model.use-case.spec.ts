import { Test, TestingModule } from '@nestjs/testing';
import { CreateModelUseCase } from './create-model.use-case';
import { ModelsRepository } from '../../ports/models.repository';
import { CreateModelCommand } from './create-model.command';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ModelAlreadyExistsError,
  ModelCreationFailedError,
} from '../../models.errors';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelConfig } from 'src/domain/models/domain/model-config.entity';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';

describe('CreateModelUseCase', () => {
  let useCase: CreateModelUseCase;
  let mockFindOne: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    mockFindOne = jest.fn();
    mockCreate = jest.fn();

    const mockModelsRepository = {
      findOne: mockFindOne,
      create: mockCreate,
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateModelUseCase,
        {
          provide: ModelsRepository,
          useValue: mockModelsRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateModelUseCase>(CreateModelUseCase);
  });

  describe('execute', () => {
    const command = new CreateModelCommand(
      'test-model',
      ModelProvider.OPENAI,
      'Test Model',
      true,
      false,
      false,
    );

    it('should create a model successfully', async () => {
      const expectedModel = new Model({
        name: 'test-model',
        provider: ModelProvider.OPENAI,
      });
      const expectedConfig = new ModelConfig({
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
      });
      const expectedModelWithConfig = new ModelWithConfig(
        expectedModel,
        expectedConfig,
      );

      mockFindOne.mockResolvedValue(undefined);
      mockCreate.mockResolvedValue(expectedModelWithConfig);

      const result = await useCase.execute(command);

      expect(mockFindOne).toHaveBeenCalledWith({
        name: 'test-model',
        provider: ModelProvider.OPENAI,
      });
      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.objectContaining({
          name: 'test-model',
          provider: ModelProvider.OPENAI,
        }) as Model,
        config: expect.objectContaining({
          displayName: 'Test Model',
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }) as ModelConfig,
      });
      expect(result).toEqual(expectedModelWithConfig);
    });

    it('should throw ModelAlreadyExistsError when model already exists', async () => {
      const existingModel = new ModelWithConfig(
        new Model({
          name: 'test-model',
          provider: ModelProvider.OPENAI,
        }),
        new ModelConfig({
          displayName: 'Existing Model',
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      );

      mockFindOne.mockResolvedValue(existingModel);

      await expect(useCase.execute(command)).rejects.toThrow(
        ModelAlreadyExistsError,
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw ModelCreationFailedError when repository throws unexpected error', async () => {
      mockFindOne.mockResolvedValue(undefined);
      mockCreate.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(command)).rejects.toThrow(
        ModelCreationFailedError,
      );
    });
  });
});
