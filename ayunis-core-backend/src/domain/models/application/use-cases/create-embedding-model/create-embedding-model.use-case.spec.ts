import { CreateEmbeddingModelUseCase } from './create-embedding-model.use-case';
import { CreateEmbeddingModelCommand } from './create-embedding-model.command';
import type { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';

describe('CreateEmbeddingModelUseCase', () => {
  let useCase: CreateEmbeddingModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;

  beforeEach(() => {
    modelsRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      findOneImageGeneration: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateEmbeddingModelUseCase(modelsRepository);
  });

  const createCommand = (): CreateEmbeddingModelCommand =>
    new CreateEmbeddingModelCommand({
      name: 'text-embedding-3-small',
      provider: ModelProvider.OPENAI,
      displayName: 'Text Embedding 3 Small',
      isArchived: false,
      dimensions: EmbeddingDimensions.DIMENSION_1536,
    });

  it('keeps the use case focused on its business logic', async () => {
    modelsRepository.findOne.mockResolvedValue(undefined);
    modelsRepository.save.mockResolvedValue();

    const result = await useCase.execute(createCommand());

    expect(result).toBeInstanceOf(EmbeddingModel);
    expect(modelsRepository.save).toHaveBeenCalledWith(result);
  });

  it('preserves domain errors without wrapping them', async () => {
    modelsRepository.findOne.mockResolvedValue(
      new EmbeddingModel({
        name: 'text-embedding-3-small',
        provider: ModelProvider.OPENAI,
        displayName: 'Text Embedding 3 Small',
        isArchived: false,
        dimensions: EmbeddingDimensions.DIMENSION_1536,
      }),
    );

    await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
      ModelAlreadyExistsError,
    );
  });

  it('maps unexpected repository failures to a model error', async () => {
    modelsRepository.findOne.mockResolvedValue(undefined);
    modelsRepository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
      UnexpectedModelError,
    );
  });

  it('maps unexpected lookup failures to a model error', async () => {
    modelsRepository.findOne.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
      UnexpectedModelError,
    );
  });
});
