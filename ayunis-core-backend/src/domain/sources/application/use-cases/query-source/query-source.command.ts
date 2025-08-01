import { UUID } from 'crypto';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

export class QuerySourceCommand {
  constructor(
    public readonly filter: {
      sourceId: UUID;
    },
    public readonly query: string,
    public readonly options?: {
      similarityThreshold?: number; // 0.0 = identical, 2.0 = opposite (default: 0.8)
      limit?: number; // Maximum number of results (default: 50)
      embeddingProvider?: EmbeddingsProvider; // Which embedding provider to use (default: OpenAI)
    },
  ) {}
}
