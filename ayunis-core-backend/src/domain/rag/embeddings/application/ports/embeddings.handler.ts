import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';
import type { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';

export abstract class EmbeddingsHandler {
  /** Returns one embedding per input, in input order. */
  abstract embed(input: string[], model: EmbeddingModel): Promise<Embedding[]>;
  abstract isAvailable(): boolean;
}
