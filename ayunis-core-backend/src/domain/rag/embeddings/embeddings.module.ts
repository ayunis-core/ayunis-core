import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIEmbeddingsHandler } from './infrastructure/handler/openai-embeddings.handler';
import { EmbeddingsHandlerRegistry } from './application/embeddings-handler.registry';
import { EmbeddingsProvider } from './domain/embeddings-provider.enum';
import { EmbedTextUseCase } from './application/use-cases/embed-text/embed-text.use-case';
import { GetAvailableProvidersUseCase } from './application/use-cases/get-available-providers/get-available-providers.use-case';
import { MistralEmbeddingsHandler } from './infrastructure/handler/mistral-embeddings.handler';
import { AyunisOllamaEmbeddingsHandler } from './infrastructure/handler/ayunis-ollama-embeddings.handler';
import { EmbeddingsThrottleService } from './application/services/embeddings-throttle.service';
import { MockEmbeddingsHandler } from './infrastructure/handler/mock-embeddings.handler';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EmbeddingsHandlerRegistry,
      useFactory: (
        openaiHandler: OpenAIEmbeddingsHandler,
        mistralHandler: MistralEmbeddingsHandler,
        ayunisHandler: AyunisOllamaEmbeddingsHandler,
        mockHandler: MockEmbeddingsHandler,
        configService: ConfigService,
      ) => {
        const registry = new EmbeddingsHandlerRegistry(configService);
        registry.registerHandler(EmbeddingsProvider.OPENAI, openaiHandler);
        registry.registerHandler(EmbeddingsProvider.MISTRAL, mistralHandler);
        registry.registerHandler(EmbeddingsProvider.AYUNIS, ayunisHandler);
        registry.registerMockHandler(mockHandler);
        return registry;
      },
      inject: [
        OpenAIEmbeddingsHandler,
        MistralEmbeddingsHandler,
        AyunisOllamaEmbeddingsHandler,
        MockEmbeddingsHandler,
        ConfigService,
      ],
    },
    MistralEmbeddingsHandler,
    OpenAIEmbeddingsHandler,
    AyunisOllamaEmbeddingsHandler,
    MockEmbeddingsHandler,
    EmbeddingsThrottleService,
    // Use Cases
    EmbedTextUseCase,
    GetAvailableProvidersUseCase,
  ],
  exports: [EmbedTextUseCase, GetAvailableProvidersUseCase],
})
export class EmbeddingsModule {}
