import { EmbeddingModel } from './embedding-model.entity';

export type EmbeddingVector = number[];

export class Embedding {
  constructor(
    public readonly vector: EmbeddingVector,
    public readonly text: string,
    public readonly model: EmbeddingModel,
  ) {}
}
