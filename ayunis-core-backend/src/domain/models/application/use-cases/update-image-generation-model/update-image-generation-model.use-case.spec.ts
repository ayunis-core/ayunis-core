import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateImageGenerationModelUseCase } from './update-image-generation-model.use-case';
import { UpdateImageGenerationModelCommand } from './update-image-generation-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ImageGenerationModelProviderNotSupportedError,
  ModelNotFoundByIdError,
} from '../../models.errors';
import { ModelPolicyService } from '../../services/model-policy.service';
import type { UUID } from 'crypto';

describe('UpdateImageGenerationModelUseCase', () => {
  let useCase: UpdateImageGenerationModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;

  const modelId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockModelsRepository = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      findOneImageGeneration: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateImageGenerationModelUseCase,
        ModelPolicyService,
        { provide: ModelsRepository, useValue: mockModelsRepository },
      ],
    }).compile();

    useCase = module.get(UpdateImageGenerationModelUseCase);
    modelsRepository = module.get(ModelsRepository);
  });

  it('updates an Azure image-generation model', async () => {
    const existingModel = new ImageGenerationModel({
      id: modelId,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });
    const command = new UpdateImageGenerationModelCommand({
      id: modelId,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1 Updated',
      isArchived: false,
    });

    modelsRepository.findOne.mockResolvedValue(existingModel);
    modelsRepository.findOneImageGeneration.mockResolvedValue(existingModel);
    modelsRepository.save.mockResolvedValue();

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(ImageGenerationModel);
    expect(result.displayName).toBe('GPT Image 1 Updated');
  });

  it('rejects non-Azure image-generation models explicitly', async () => {
    const command = new UpdateImageGenerationModelCommand({
      id: modelId,
      name: 'gpt-image-1',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT Image 1',
      isArchived: false,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ImageGenerationModelProviderNotSupportedError,
    );
    expect(modelsRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws when the target model does not exist', async () => {
    const command = new UpdateImageGenerationModelCommand({
      id: modelId,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });

    modelsRepository.findOne.mockResolvedValue(undefined);
    modelsRepository.findOneImageGeneration.mockResolvedValue(undefined);

    await expect(useCase.execute(command)).rejects.toThrow(
      ModelNotFoundByIdError,
    );
    expect(modelsRepository.save).not.toHaveBeenCalled();
  });
});
