import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { Embedding } from '../../domain/embedding.entity';
import { Mistral } from '@mistralai/mistralai';
import { ConfigService } from '@nestjs/config';
import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { EmbeddingsProvider } from '../../domain/embeddings-provider.enum';
import { NoEmbeddingsReturnedError } from '../../application/embeddings.errors';

@Injectable()
export class MistralEmbeddingsHandler extends EmbeddingsHandler {
  private readonly logger = new Logger(MistralEmbeddingsHandler.name);
  private readonly mistral: Mistral;

  constructor(private readonly configService: ConfigService) {
    super();
    this.mistral = new Mistral({
      apiKey: this.configService.get('embeddings.mistral.apiKey'),
    });
  }

  isAvailable(): boolean {
    return !!this.configService.get('embeddings.mistral.apiKey');
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    this.logger.log('embed', {
      model: model.name,
      input: input.length,
    });
    const embeddingsBatchResponse = await this.mistral.embeddings.create({
      model: model.name,
      inputs: input,
    });

    return embeddingsBatchResponse.data.map((data) => {
      if (!data.embedding) {
        this.logger.error('No embedding returned from Mistral', {
          data,
        });
        throw new NoEmbeddingsReturnedError(EmbeddingsProvider.MISTRAL, {
          data,
        });
      }
      if (data.index === undefined) {
        this.logger.error('No index returned from Mistral', {
          data,
        });
        throw new NoEmbeddingsReturnedError(EmbeddingsProvider.MISTRAL, {
          data,
        });
      }
      return new Embedding(data.embedding, input[data.index], model);
    });
  }
}
