import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { EmbedTextCommand } from './embed-text.command';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { EmbeddingsThrottleService } from '../../services/embeddings-throttle.service';
import { Embedding } from '../../../domain/embedding.entity';
import { UnexpectedEmbeddingsError } from '../../embeddings.errors';

@Injectable()
export class EmbedTextUseCase {
  private readonly logger = new Logger(EmbedTextUseCase.name);

  constructor(
    private readonly providerRegistry: EmbeddingsHandlerRegistry,
    private readonly throttle: EmbeddingsThrottleService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedEmbeddingsError)
  async execute(command: EmbedTextCommand): Promise<Embedding[]> {
    this.logger.log('execute', {
      model: command.model,
    });
    const handler = this.providerRegistry.getHandler(command.model.provider);

    // Route through the global throttle so ingestion floods can never
    // starve retrieval; retrieval embeds jump ahead of ingestion embeds.
    return this.throttle.run(command.priority, () =>
      handler.embed(command.texts, command.model),
    );
  }
}
