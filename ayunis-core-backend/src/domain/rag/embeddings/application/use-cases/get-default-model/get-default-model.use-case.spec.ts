import { Test, TestingModule } from '@nestjs/testing';
import { GetDefaultModelUseCase } from './get-default-model.use-case';
import { GetDefaultModelQuery } from './get-default-model.query';
import { EmbeddingModel } from '../../../domain/embedding-model.entity';
import { OPENAI_EMBEDDING_MODEL_SMALL } from '../../models/openai-embedding.model';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';

describe('GetDefaultModelUseCase', () => {
  let useCase: GetDefaultModelUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetDefaultModelUseCase],
    }).compile();

    useCase = module.get<GetDefaultModelUseCase>(GetDefaultModelUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return the default model successfully', () => {
      // Arrange
      const query = new GetDefaultModelQuery();

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(result).toBe(OPENAI_EMBEDDING_MODEL_SMALL);
      expect(result).toBeInstanceOf(EmbeddingModel);
      expect(result.name).toBe('text-embedding-3-large');
      expect(result.provider).toBe(EmbeddingsProvider.OPENAI);
      expect(result.dimensions).toBe(1536);
    });

    it('should return the same model instance on multiple calls', () => {
      // Arrange
      const query = new GetDefaultModelQuery();

      // Act
      const result1 = useCase.execute(query);
      const result2 = useCase.execute(query);

      // Assert
      expect(result1).toBe(result2);
      expect(result1).toBe(OPENAI_EMBEDDING_MODEL_SMALL);
    });

    it('should not require any parameters in the query', () => {
      // Arrange
      const query = new GetDefaultModelQuery();

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBe(OPENAI_EMBEDDING_MODEL_SMALL);
    });
  });
});
