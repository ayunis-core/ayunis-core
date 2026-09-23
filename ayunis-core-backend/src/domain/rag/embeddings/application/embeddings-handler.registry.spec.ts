import type { ConfigService } from '@nestjs/config';
import { EmbeddingsHandlerRegistry } from './embeddings-handler.registry';
import type { EmbeddingsHandler } from './ports/embeddings.handler';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

function createHandler(available = true): EmbeddingsHandler {
  return {
    embed: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(available),
  };
}

describe('EmbeddingsHandlerRegistry', () => {
  it('uses the registered provider handler when mock inference is disabled', () => {
    const configService = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    const registry = new EmbeddingsHandlerRegistry(configService);
    const providerHandler = createHandler();
    const mockHandler = createHandler();
    registry.registerHandler(EmbeddingsProvider.MISTRAL, providerHandler);
    registry.registerMockHandler(mockHandler);

    expect(registry.getHandler(EmbeddingsProvider.MISTRAL)).toBe(
      providerHandler,
    );
  });

  it('uses the mock handler when mock inference is enabled', () => {
    const configService = {
      get: jest.fn().mockReturnValue(true),
    } as unknown as ConfigService;
    const registry = new EmbeddingsHandlerRegistry(configService);
    const providerHandler = createHandler();
    const mockHandler = createHandler();
    registry.registerHandler(EmbeddingsProvider.MISTRAL, providerHandler);
    registry.registerMockHandler(mockHandler);

    expect(registry.getHandler(EmbeddingsProvider.MISTRAL)).toBe(mockHandler);
  });

  it('reports only available configured providers', () => {
    const configService = {
      get: jest.fn().mockReturnValue(true),
    } as unknown as ConfigService;
    const registry = new EmbeddingsHandlerRegistry(configService);
    registry.registerHandler(EmbeddingsProvider.MISTRAL, createHandler(true));
    registry.registerHandler(EmbeddingsProvider.OPENAI, createHandler(false));
    registry.registerMockHandler(createHandler());

    expect(registry.getAvailableProviders()).toEqual([
      EmbeddingsProvider.MISTRAL,
    ]);
  });
});
