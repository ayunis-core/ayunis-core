import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { Embedding } from '../../domain/embedding.entity';

export abstract class EmbeddingsHandler {
  abstract embed(input: string[], model: EmbeddingModel): Promise<Embedding[]>;
  abstract isAvailable(): boolean;
}
