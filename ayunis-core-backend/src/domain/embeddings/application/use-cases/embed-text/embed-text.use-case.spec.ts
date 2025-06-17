import { Test, TestingModule } from '@nestjs/testing';
import { EmbedTextUseCase } from './embed-text.use-case';
import { EmbeddingsProviderRegistry } from '../../embeddings-provider.registry';
import { EmbedTextCommand } from './embed-text.command';
import { Embedding } from '../../../domain/embedding.entity';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';
import { OPENAI_EMBEDDING_MODEL_SMALL } from '../../models/openai-embedding.model';

describe('EmbedTextUseCase', () => {
  let useCase: EmbedTextUseCase;
  let mockProviderRegistry: Partial<EmbeddingsProviderRegistry>;
  let mockHandler: any;

  beforeEach(async () => {
    mockHandler = {
      embed: jest.fn(),
    };

    mockProviderRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getAvailableProviders: jest.fn(),
      registerHandler: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbedTextUseCase,
        { provide: EmbeddingsProviderRegistry, useValue: mockProviderRegistry },
      ],
    }).compile();

    useCase = module.get<EmbedTextUseCase>(EmbedTextUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should embed text successfully', async () => {
      // Arrange
      const texts = ['Hello world', 'This is a test'];
      const command = new EmbedTextCommand(texts);

      const expectedEmbeddings = [
        new Embedding(
          [0.1, 0.2, 0.3],
          'Hello world',
          OPENAI_EMBEDDING_MODEL_SMALL,
        ),
        new Embedding(
          [0.4, 0.5, 0.6],
          'This is a test',
          OPENAI_EMBEDDING_MODEL_SMALL,
        ),
      ];

      mockHandler.embed.mockResolvedValue(expectedEmbeddings);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockProviderRegistry.getHandler).toHaveBeenCalledWith(
        EmbeddingsProvider.OPENAI,
      );
      expect(mockHandler.embed).toHaveBeenCalledWith(
        texts,
        OPENAI_EMBEDDING_MODEL_SMALL,
      );
      expect(result).toBe(expectedEmbeddings);
    });

    it('should handle single text input', async () => {
      // Arrange
      const texts = ['Single text input'];
      const command = new EmbedTextCommand(texts);

      const expectedEmbeddings = [
        new Embedding(
          [0.1, 0.2, 0.3],
          'Single text input',
          OPENAI_EMBEDDING_MODEL_SMALL,
        ),
      ];

      mockHandler.embed.mockResolvedValue(expectedEmbeddings);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockHandler.embed).toHaveBeenCalledWith(
        texts,
        OPENAI_EMBEDDING_MODEL_SMALL,
      );
      expect(result).toBe(expectedEmbeddings);
      expect(result).toHaveLength(1);
    });

    it('should handle empty text array', async () => {
      // Arrange
      const texts: string[] = [];
      const command = new EmbedTextCommand(texts);

      const expectedEmbeddings: Embedding[] = [];
      mockHandler.embed.mockResolvedValue(expectedEmbeddings);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockHandler.embed).toHaveBeenCalledWith(
        texts,
        OPENAI_EMBEDDING_MODEL_SMALL,
      );
      expect(result).toEqual([]);
    });

    it('should handle provider registry errors', async () => {
      // Arrange
      const texts = ['Test text'];
      const command = new EmbedTextCommand(texts);

      const registryError = new Error('Provider not found');
      jest.spyOn(mockProviderRegistry, 'getHandler').mockImplementation(() => {
        throw registryError;
      });

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Provider not found',
      );
      expect(mockProviderRegistry.getHandler).toHaveBeenCalledWith(
        EmbeddingsProvider.OPENAI,
      );
      expect(mockHandler.embed).not.toHaveBeenCalled();
    });

    it('should handle embedding handler errors', async () => {
      // Arrange
      const texts = ['Test text'];
      const command = new EmbedTextCommand(texts);

      const handlerError = new Error('Embedding failed');
      mockHandler.embed.mockRejectedValue(handlerError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Embedding failed',
      );
      expect(mockProviderRegistry.getHandler).toHaveBeenCalledWith(
        EmbeddingsProvider.OPENAI,
      );
      expect(mockHandler.embed).toHaveBeenCalledWith(
        texts,
        OPENAI_EMBEDDING_MODEL_SMALL,
      );
    });

    it('should handle large text arrays', async () => {
      // Arrange
      const texts = Array.from({ length: 100 }, (_, i) => `Text ${i}`);
      const command = new EmbedTextCommand(texts);

      const expectedEmbeddings = texts.map(
        (text, i) =>
          new Embedding(
            [i * 0.1, i * 0.2, i * 0.3],
            text,
            OPENAI_EMBEDDING_MODEL_SMALL,
          ),
      );

      mockHandler.embed.mockResolvedValue(expectedEmbeddings);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockHandler.embed).toHaveBeenCalledWith(
        texts,
        OPENAI_EMBEDDING_MODEL_SMALL,
      );
      expect(result).toBe(expectedEmbeddings);
      expect(result).toHaveLength(100);
    });
  });
});
