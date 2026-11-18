import type { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

export class AssertEmbeddingsProviderAvailableQuery {
  readonly provider: EmbeddingsProvider;

  constructor(params: { provider: EmbeddingsProvider }) {
    this.provider = params.provider;
  }
}
