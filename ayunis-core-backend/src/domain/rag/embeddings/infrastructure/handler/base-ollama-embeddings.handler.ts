import { Ollama } from 'ollama';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { Embedding } from '../../domain/embedding.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class BaseOllamaEmbeddingsHandler extends EmbeddingsHandler {
  protected client: Ollama;

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const ollamaEmbeddingsResponse = await this.client.embed({
      model: model.name,
      input: input,
    });
    const embeddings = ollamaEmbeddingsResponse.embeddings.map(
      (embedding, i) => {
        return new Embedding(embedding, input[i], model);
      },
    );
    return embeddings;
  }
}
