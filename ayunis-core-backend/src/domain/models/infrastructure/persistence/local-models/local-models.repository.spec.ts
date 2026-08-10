import { QueryFailedError, type Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { LocalModelsRepository } from './local-models.repository';
import { ModelMapper } from './mappers/model.mapper';
import type { ModelRecord } from './schema/model.record';
import {
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
  LanguageModelRecord,
} from './schema/model.record';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  ModelAlreadyExistsError,
  ModelErrorCode,
} from 'src/domain/models/application/models.errors';

describe('LocalModelsRepository', () => {
  let repository: LocalModelsRepository;
  let localModelRepository: jest.Mocked<Repository<ModelRecord>>;
  let mapper: ModelMapper;

  const modelId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(() => {
    localModelRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<ModelRecord>>;

    mapper = new ModelMapper();

    repository = new LocalModelsRepository(localModelRepository, mapper);
  });

  const buildLanguageRecord = (): LanguageModelRecord => {
    const record = new LanguageModelRecord();
    record.id = modelId;
    record.name = 'gpt-4o';
    record.provider = ModelProvider.OPENAI;
    record.displayName = 'GPT-4o';
    record.canStream = true;
    record.canUseTools = true;
    record.isReasoning = false;
    record.canVision = true;
    record.isArchived = false;
    record.createdAt = new Date('2025-01-01T00:00:00Z');
    record.updatedAt = new Date('2025-01-02T00:00:00Z');
    return record;
  };

  const buildEmbeddingRecord = (): EmbeddingModelRecord => {
    const record = new EmbeddingModelRecord();
    record.id = modelId;
    record.name = 'text-embedding-3-small';
    record.provider = ModelProvider.OPENAI;
    record.displayName = 'Text Embedding 3 Small';
    record.dimensions = EmbeddingDimensions.DIMENSION_1536;
    record.isArchived = false;
    record.createdAt = new Date('2025-01-01T00:00:00Z');
    record.updatedAt = new Date('2025-01-02T00:00:00Z');
    return record;
  };

  const buildImageGenerationRecord = (): ImageGenerationModelRecord => {
    const record = new ImageGenerationModelRecord();
    record.id = modelId;
    record.name = 'gpt-image-1';
    record.provider = ModelProvider.AZURE;
    record.displayName = 'GPT Image 1';
    record.isArchived = false;
    record.createdAt = new Date('2025-01-01T00:00:00Z');
    record.updatedAt = new Date('2025-01-02T00:00:00Z');
    return record;
  };

  describe('save', () => {
    it('maps a concurrent unique constraint violation to a model conflict', async () => {
      const model = new LanguageModel({
        id: modelId,
        name: 'gpt-4o',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4o',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: true,
        isArchived: false,
      });
      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'IDX_7c11834d93fa8eaf208a48d66a',
      });
      localModelRepository.save.mockRejectedValue(
        new QueryFailedError('UPDATE models', [], driverError),
      );

      const result = repository.save(model);

      await expect(result).rejects.toMatchObject({
        code: ModelErrorCode.MODEL_ALREADY_EXISTS,
        statusCode: 409,
      });
      await expect(result).rejects.toBeInstanceOf(ModelAlreadyExistsError);
    });

    it('does not misclassify another unique constraint violation', async () => {
      const model = new LanguageModel({
        id: modelId,
        name: 'gpt-4o',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4o',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: true,
        isArchived: false,
      });
      const driverError = Object.assign(new Error('duplicate primary key'), {
        code: '23505',
        constraint: 'PK_ef9ed7160ea69013636466bf2d5',
      });
      const queryError = new QueryFailedError('UPDATE models', [], driverError);
      localModelRepository.save.mockRejectedValue(queryError);

      await expect(repository.save(model)).rejects.toBe(queryError);
    });
  });

  describe('findOneImageGeneration', () => {
    it('returns the mapped domain model when the row is an image-generation record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(
        buildImageGenerationRecord(),
      );

      const result = await repository.findOneImageGeneration(modelId);

      expect(result).toBeInstanceOf(ImageGenerationModel);
      expect(result?.id).toBe(modelId);
      expect(localModelRepository.findOneBy).toHaveBeenCalledWith({
        id: modelId,
      });
    });

    it('returns undefined when the row exists but is a language record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(buildLanguageRecord());

      const result = await repository.findOneImageGeneration(modelId);

      expect(result).toBeUndefined();
    });

    it('returns undefined when the row exists but is an embedding record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(buildEmbeddingRecord());

      const result = await repository.findOneImageGeneration(modelId);

      expect(result).toBeUndefined();
    });

    it('returns undefined when no row matches the id', async () => {
      localModelRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.findOneImageGeneration(modelId);

      expect(result).toBeUndefined();
    });
  });

  describe('findOneLanguage', () => {
    it('returns the mapped domain model when the row is a language record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(buildLanguageRecord());

      const result = await repository.findOneLanguage(modelId);

      expect(result).toBeInstanceOf(LanguageModel);
    });

    it('returns undefined when the row is an image-generation record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(
        buildImageGenerationRecord(),
      );

      const result = await repository.findOneLanguage(modelId);

      expect(result).toBeUndefined();
    });
  });

  describe('findOneEmbedding', () => {
    it('returns the mapped domain model when the row is an embedding record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(buildEmbeddingRecord());

      const result = await repository.findOneEmbedding(modelId);

      expect(result).toBeInstanceOf(EmbeddingModel);
    });

    it('returns undefined when the row is an image-generation record', async () => {
      localModelRepository.findOneBy.mockResolvedValue(
        buildImageGenerationRecord(),
      );

      const result = await repository.findOneEmbedding(modelId);

      expect(result).toBeUndefined();
    });
  });
});
