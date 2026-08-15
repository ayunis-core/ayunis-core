import { Module } from '@nestjs/common';
import { getLoggerToken, type PinoLogger } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { OpenAIEmbeddingsHandler } from './infrastructure/handler/openai-embeddings.handler';
import { EmbeddingsHandlerRegistry } from './application/embeddings-handler.registry';
import { EmbeddingsProvider } from './domain/embeddings-provider.enum';
import { EmbedTextUseCase } from './application/use-cases/embed-text/embed-text.use-case';
import { GetAvailableProvidersUseCase } from './application/use-cases/get-available-providers/get-available-providers.use-case';
import { MistralEmbeddingsHandler } from './infrastructure/handler/mistral-embeddings.handler';
import { AyunisOllamaEmbeddingsHandler } from './infrastructure/handler/ayunis-ollama-embeddings.handler';
import { EmbeddingsThrottleService } from './application/services/embeddings-throttle.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EmbeddingsHandlerRegistry,
      useFactory: (
        openaiHandler: OpenAIEmbeddingsHandler,
        mistralHandler: MistralEmbeddingsHandler,
        ayunisHandler: AyunisOllamaEmbeddingsHandler,
        logger: PinoLogger,
      ) => {
        const registry = new EmbeddingsHandlerRegistry(logger);
        registry.registerHandler(EmbeddingsProvider.OPENAI, openaiHandler);
        registry.registerHandler(EmbeddingsProvider.MISTRAL, mistralHandler);
        registry.registerHandler(EmbeddingsProvider.AYUNIS, ayunisHandler);
        return registry;
      },
      inject: [
        OpenAIEmbeddingsHandler,
        MistralEmbeddingsHandler,
        AyunisOllamaEmbeddingsHandler,
        getLoggerToken(EmbeddingsHandlerRegistry.name),
      ],
    },
    MistralEmbeddingsHandler,
    OpenAIEmbeddingsHandler,
    AyunisOllamaEmbeddingsHandler,
    EmbeddingsThrottleService,
    // Use Cases
    EmbedTextUseCase,
    GetAvailableProvidersUseCase,
  ],
  exports: [EmbedTextUseCase, GetAvailableProvidersUseCase],
})
export class EmbeddingsModule {}
