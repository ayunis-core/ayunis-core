import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from 'src/domain/rag/embeddings/application/ports/embeddings.handler';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';

@Injectable()
export class MockEmbeddingsHandler extends EmbeddingsHandler {
  embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const vector = Array<number>(model.dimensions).fill(1);
    const embeddings = input.map(
      (text) => new Embedding([...vector], text, model),
    );
    return Promise.resolve(embeddings);
  }

  isAvailable(): boolean {
    return true;
  }
}
