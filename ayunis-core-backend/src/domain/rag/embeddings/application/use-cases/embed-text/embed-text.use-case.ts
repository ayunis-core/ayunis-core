import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmbedTextCommand } from './embed-text.command';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { EmbeddingsThrottleService } from '../../services/embeddings-throttle.service';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { toWellFormedText } from 'src/common/util/unicode-sanitizer';

@Injectable()
export class EmbedTextUseCase {
  constructor(
    @InjectPinoLogger(EmbedTextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly providerRegistry: EmbeddingsHandlerRegistry,
    private readonly throttle: EmbeddingsThrottleService,
  ) {}

  async execute(command: EmbedTextCommand): Promise<Embedding[]> {
    this.logger.info({ model: command.model }, 'execute');
    try {
      const handler = this.providerRegistry.getHandler(command.model.provider);

      // Lone surrogates (an emoji split at a chunk boundary) serialize to
      // \udXXX escapes that strict provider JSON decoders reject with 400
      // (incident #536), so every payload is made well-formed here — the
      // single chokepoint all ingest and retrieval embeds pass through.
      const texts = command.texts.map(toWellFormedText);

      // Route through the global throttle so ingestion floods can never
      // starve retrieval; retrieval embeds jump ahead of ingestion embeds.
      // The await is load-bearing: returning the bare promise would let
      // rejections bypass this catch block.
      return await this.throttle.run(command.priority, () =>
        handler.embed(texts, command.model),
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
        this.logger.error(
          { code: providerError.code, ...providerError.context },
          'Embeddings provider unavailable',
        );
        throw providerError;
      }
      this.logger.error({ err: error as Error }, 'Error embedding text');
      throw error;
    }
  }
}
