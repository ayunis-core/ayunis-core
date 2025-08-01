import { EmbeddingsProvider } from './embeddings-provider.enum';

export class EmbeddingModel {
  constructor(
    public readonly name: string,
    public readonly provider: EmbeddingsProvider,
    public readonly dimensions: number,
  ) {}
}
