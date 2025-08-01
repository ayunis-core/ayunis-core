import { Injectable, Logger } from '@nestjs/common';
import { EmbedTextCommand } from './embed-text.command';
import { EmbeddingsProviderRegistry } from '../../embeddings-provider.registry';
import { Embedding } from '../../../domain/embedding.entity';
import { OPENAI_EMBEDDING_MODEL_SMALL } from '../../models/openai-embedding.model';

@Injectable()
export class EmbedTextUseCase {
  private readonly logger = new Logger(EmbedTextUseCase.name);

  constructor(private readonly providerRegistry: EmbeddingsProviderRegistry) {}

  async execute(command: EmbedTextCommand): Promise<Embedding[]> {
    const model = OPENAI_EMBEDDING_MODEL_SMALL;
    this.logger.log(
      `Embedding text with model ${model.name} (provider: ${model.provider})`,
    );
    const handler = this.providerRegistry.getHandler(model.provider);

    return handler.embed(command.texts, model);
  }
}
