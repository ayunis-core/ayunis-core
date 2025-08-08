import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIEmbeddingsHandler } from './infrastructure/handler/openai-embeddings.handler';
import { EmbeddingsHandlerRegistry } from './application/embeddings-handler.registry';
import { EmbeddingsProvider } from './domain/embeddings-provider.enum';

// Use Cases
import { EmbedTextUseCase } from './application/use-cases/embed-text/embed-text.use-case';
import { GetAvailableProvidersUseCase } from './application/use-cases/get-available-providers/get-available-providers.use-case';
import { MistralEmbeddingsHandler } from './infrastructure/handler/mistral-embeddings.handler';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EmbeddingsHandlerRegistry,
      useFactory: (
        openaiHandler: OpenAIEmbeddingsHandler,
        mistralHandler: MistralEmbeddingsHandler,
      ) => {
        const registry = new EmbeddingsHandlerRegistry();
        registry.registerHandler(EmbeddingsProvider.OPENAI, openaiHandler);
        registry.registerHandler(EmbeddingsProvider.MISTRAL, mistralHandler);
        return registry;
      },
      inject: [OpenAIEmbeddingsHandler, MistralEmbeddingsHandler],
    },
    MistralEmbeddingsHandler,
    OpenAIEmbeddingsHandler,
    // Use Cases
    EmbedTextUseCase,
    GetAvailableProvidersUseCase,
  ],
  exports: [EmbedTextUseCase, GetAvailableProvidersUseCase],
})
export class EmbeddingsModule {}
