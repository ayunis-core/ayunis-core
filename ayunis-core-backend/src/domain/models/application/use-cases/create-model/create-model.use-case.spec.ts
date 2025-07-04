import { Test, TestingModule } from '@nestjs/testing';
import { CreateModelUseCase } from './create-model.use-case';
import { ModelsRepository } from '../../ports/models.repository';
import { CreateModelCommand } from './create-model.command';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';
import {
  ModelAlreadyExistsError,
  ModelCreationFailedError,
} from '../../models.errors';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelConfig } from 'src/domain/models/domain/model-config.entity';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';

describe('CreateModelUseCase', () => {
  let useCase: CreateModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;

  beforeEach(async () => {
    const mockModelsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
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
    modelsRepository = module.get(ModelsRepository);
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
      const expectedModel = new Model('test-model', ModelProvider.OPENAI);
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

      modelsRepository.findOne.mockResolvedValue(undefined);
      modelsRepository.create.mockResolvedValue(expectedModelWithConfig);

      const result = await useCase.execute(command);

      expect(modelsRepository.findOne).toHaveBeenCalledWith({
        name: 'test-model',
        provider: ModelProvider.OPENAI,
      });
      expect(modelsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({
            name: 'test-model',
            provider: ModelProvider.OPENAI,
          }),
          config: expect.objectContaining({
            displayName: 'Test Model',
            canStream: true,
            isReasoning: false,
            isArchived: false,
          }),
        }),
      );
      expect(result).toEqual(expectedModelWithConfig);
    });

    it('should throw ModelAlreadyExistsError when model already exists', async () => {
      const existingModel = new ModelWithConfig(
        new Model('test-model', ModelProvider.OPENAI),
        new ModelConfig({
          displayName: 'Existing Model',
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      );

      modelsRepository.findOne.mockResolvedValue(existingModel);

      await expect(useCase.execute(command)).rejects.toThrow(
        ModelAlreadyExistsError,
      );
      expect(modelsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ModelCreationFailedError when repository throws unexpected error', async () => {
      modelsRepository.findOne.mockResolvedValue(undefined);
      modelsRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(command)).rejects.toThrow(
        ModelCreationFailedError,
      );
    });
  });
});
