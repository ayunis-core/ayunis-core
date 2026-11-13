import type { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';

type EmbeddingModelIdentity = Readonly<
  Pick<EmbeddingModel, 'id' | 'provider' | 'name' | 'dimensions'>
>;

export class PreparedContentEmbeddings {
  readonly model: EmbeddingModelIdentity;

  constructor(
    model: EmbeddingModelIdentity,
    readonly vectorsByText: ReadonlyMap<string, number[]>,
  ) {
    this.model = {
      id: model.id,
      provider: model.provider,
      name: model.name,
      dimensions: model.dimensions,
    };
  }

  matchesModel(model: EmbeddingModelIdentity): boolean {
    return (
      this.model.id === model.id &&
      this.model.provider === model.provider &&
      this.model.name === model.name &&
      this.model.dimensions === model.dimensions
    );
  }

  merge(other: PreparedContentEmbeddings): PreparedContentEmbeddings {
    if (!this.matchesModel(other.model)) return this;
    return new PreparedContentEmbeddings(
      this.model,
      new Map([...this.vectorsByText, ...other.vectorsByText]),
    );
  }
}
