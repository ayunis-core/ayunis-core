import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { Embedding } from '../../domain/embedding.entity';
import { Mistral } from '@mistralai/mistralai';
import { ConfigService } from '@nestjs/config';
import { EmbeddingModel } from '../../domain/embedding-model.entity';

@Injectable()
export class MistralEmbeddingsHandler extends EmbeddingsHandler {
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
    const embeddingsBatchResponse = await this.mistral.embeddings.create({
      model: 'mistral-embed',
      inputs: input,
    });

    return embeddingsBatchResponse.data.map((data) => {
      if (!data.embedding) {
        throw new Error('No embedding returned from Mistral');
      }
      if (!data.index) {
        throw new Error('No index returned from Mistral');
      }
      return new Embedding(data.embedding, input[data.index], model);
    });
  }
}
