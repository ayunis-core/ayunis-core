import { Injectable, Logger } from '@nestjs/common';
import { EmbedTextCommand } from './embed-text.command';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { EmbeddingsThrottleService } from '../../services/embeddings-throttle.service';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';

@Injectable()
export class EmbedTextUseCase {
  private readonly logger = new Logger(EmbedTextUseCase.name);

  constructor(
    private readonly providerRegistry: EmbeddingsHandlerRegistry,
    private readonly throttle: EmbeddingsThrottleService,
  ) {}

  async execute(command: EmbedTextCommand): Promise<Embedding[]> {
    this.logger.log('execute', {
      model: command.model,
    });
    try {
      const handler = this.providerRegistry.getHandler(command.model.provider);

      // Route through the global throttle so ingestion floods can never
      // starve retrieval; retrieval embeds jump ahead of ingestion embeds.
      // The await is load-bearing: returning the bare promise would let
      // rejections bypass this catch block.
      return await this.throttle.run(command.priority, () =>
        handler.embed(command.texts, command.model),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      const providerError = wrapProviderFailure(error, {
        provider: command.model.provider,
        modelId: command.model.name,
      });
      if (providerError) {
        this.logger.error('Embeddings provider unavailable', {
          code: providerError.code,
          ...providerError.context,
        });
        throw providerError;
      }
      this.logger.error('Error embedding text', {
        error: error as Error,
      });
      throw error;
    }
  }
}
