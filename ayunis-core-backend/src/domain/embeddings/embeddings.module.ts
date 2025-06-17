import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIEmbeddingsHandler } from './infrastructure/handler/openai-embeddings.handler';
import { EmbeddingsController } from './presenters/https/embeddings.controller';
import { EmbeddingResultMapper } from './presenters/https/mappers/embedding-result.mapper';
import { EmbeddingsProviderRegistry } from './application/embeddings-provider.registry';
import { EmbeddingsProvider } from './domain/embeddings-provider.enum';

// Use Cases
import { EmbedTextUseCase } from './application/use-cases/embed-text/embed-text.use-case';
import { GetAvailableProvidersUseCase } from './application/use-cases/get-available-providers/get-available-providers.use-case';
import { GetDefaultModelUseCase } from './application/use-cases/get-default-model/get-default-model.use-case';

@Module({
  imports: [ConfigModule],
  controllers: [EmbeddingsController],
  providers: [
    {
      provide: EmbeddingsProviderRegistry,
      useFactory: (openaiHandler: OpenAIEmbeddingsHandler) => {
        const registry = new EmbeddingsProviderRegistry();
        registry.registerHandler(EmbeddingsProvider.OPENAI, openaiHandler);
        return registry;
      },
      inject: [OpenAIEmbeddingsHandler],
    },
    OpenAIEmbeddingsHandler,
    EmbeddingResultMapper,
    // Use Cases
    EmbedTextUseCase,
    GetAvailableProvidersUseCase,
    GetDefaultModelUseCase,
  ],
  exports: [
    EmbedTextUseCase,
    GetAvailableProvidersUseCase,
    GetDefaultModelUseCase,
  ],
})
export class EmbeddingsModule {}
