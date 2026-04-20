import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateImageGenerationModelUseCase } from './create-image-generation-model.use-case';
import { CreateImageGenerationModelCommand } from './create-image-generation-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ImageGenerationModelProviderNotSupportedError,
  ModelAlreadyExistsError,
} from '../../models.errors';
import { ModelPolicyService } from '../../services/model-policy.service';

describe('CreateImageGenerationModelUseCase', () => {
  let useCase: CreateImageGenerationModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;

  beforeAll(async () => {
    const mockModelsRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      findOneImageGeneration: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateImageGenerationModelUseCase,
        ModelPolicyService,
        { provide: ModelsRepository, useValue: mockModelsRepository },
      ],
    }).compile();

    useCase = module.get(CreateImageGenerationModelUseCase);
    modelsRepository = module.get(ModelsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (
    provider: ModelProvider = ModelProvider.AZURE,
  ): CreateImageGenerationModelCommand =>
    new CreateImageGenerationModelCommand({
      name: 'gpt-image-1',
      provider,
      displayName: 'GPT Image 1',
      isArchived: false,
    });

  it('creates an Azure image-generation catalog model', async () => {
    const command = createCommand();

    modelsRepository.findOne.mockResolvedValue(undefined);
    modelsRepository.save.mockResolvedValue();

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(ImageGenerationModel);
    expect(result.provider).toBe(ModelProvider.AZURE);
    expect(result.type).toBe('image-generation');
    expect(modelsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'gpt-image-1',
        provider: ModelProvider.AZURE,
      }),
    );
  });

  it('rejects non-Azure image-generation catalog models explicitly', async () => {
    await expect(
      useCase.execute(createCommand(ModelProvider.OPENAI)),
    ).rejects.toThrow(ImageGenerationModelProviderNotSupportedError);

    expect(modelsRepository.findOne).not.toHaveBeenCalled();
    expect(modelsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate image-generation catalog models', async () => {
    const command = createCommand();
    const existingModel = new ImageGenerationModel({
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });

    modelsRepository.findOne.mockResolvedValue(existingModel);

    await expect(useCase.execute(command)).rejects.toThrow(
      ModelAlreadyExistsError,
    );

    expect(modelsRepository.save).not.toHaveBeenCalled();
  });
});
