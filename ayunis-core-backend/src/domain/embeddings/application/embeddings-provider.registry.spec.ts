import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingsProviderRegistry } from './embeddings-provider.registry';
import { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from '../domain/embeddings-provider.enum';
import { Embedding } from '../domain/embedding.entity';
import { EmbeddingModel } from '../domain/embedding-model.entity';
import {
  EmbeddingsProviderNotFoundError,
  NoEmbeddingsProviderAvailableError,
} from './embeddings.errors';

// Mock embeddings handler
class MockEmbeddingsHandler extends EmbeddingsHandler {
  private readonly mockAvailable: boolean;

  constructor(available: boolean = true) {
    super();
    this.mockAvailable = available;
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    return Promise.resolve(
      input.map((text) => new Embedding([0.1, 0.2, 0.3], text, model)),
    );
  }

  isAvailable(): boolean {
    return this.mockAvailable;
  }
}

describe('EmbeddingsProviderRegistry', () => {
  let registry: EmbeddingsProviderRegistry;
  let availableHandler: MockEmbeddingsHandler;
  let unavailableHandler: MockEmbeddingsHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingsProviderRegistry],
    }).compile();

    registry = module.get<EmbeddingsProviderRegistry>(
      EmbeddingsProviderRegistry,
    );
    availableHandler = new MockEmbeddingsHandler(true);
    unavailableHandler = new MockEmbeddingsHandler(false);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('registerHandler', () => {
    it('should register a handler for a provider', () => {
      expect(() => {
        registry.registerHandler(EmbeddingsProvider.OPENAI, availableHandler);
      }).not.toThrow();
    });
  });

  describe('getHandler', () => {
    it('should return the registered handler for a provider', () => {
      registry.registerHandler(EmbeddingsProvider.OPENAI, availableHandler);

      const handler = registry.getHandler(EmbeddingsProvider.OPENAI);

      expect(handler).toBe(availableHandler);
    });

    it('should throw EmbeddingsProviderNotFoundError if provider not registered', () => {
      expect(() => {
        registry.getHandler(EmbeddingsProvider.OPENAI);
      }).toThrow(EmbeddingsProviderNotFoundError);
    });

    it('should throw NoEmbeddingsProviderAvailableError if provider not available', () => {
      registry.registerHandler(EmbeddingsProvider.OPENAI, unavailableHandler);

      expect(() => {
        registry.getHandler(EmbeddingsProvider.OPENAI);
      }).toThrow(NoEmbeddingsProviderAvailableError);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', () => {
      registry.registerHandler(EmbeddingsProvider.OPENAI, availableHandler);

      const providers = registry.getAvailableProviders();

      expect(providers).toContain(EmbeddingsProvider.OPENAI);
      expect(providers).toHaveLength(1);
    });

    it('should not return unavailable providers', () => {
      registry.registerHandler(EmbeddingsProvider.OPENAI, unavailableHandler);

      const providers = registry.getAvailableProviders();

      expect(providers).not.toContain(EmbeddingsProvider.OPENAI);
      expect(providers).toHaveLength(0);
    });

    it('should return only available providers when mixed', () => {
      registry.registerHandler(EmbeddingsProvider.OPENAI, availableHandler);
      // Register unavailable handler as a different provider for testing
      registry.registerHandler(
        'test' as EmbeddingsProvider,
        unavailableHandler,
      );

      const providers = registry.getAvailableProviders();

      expect(providers).toContain(EmbeddingsProvider.OPENAI);
      expect(providers).not.toContain('test');
      expect(providers).toHaveLength(1);
    });
  });
});
