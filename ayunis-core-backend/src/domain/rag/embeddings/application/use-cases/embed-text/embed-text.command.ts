import type { UUID } from 'crypto';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export class EmbedTextCommand {
  model: EmbeddingModel;
  texts: string[];
  priority: EmbeddingPriority;

  constructor(params: {
    model: EmbeddingModel;
    texts: string[];
    orgId: UUID;
    priority?: EmbeddingPriority;
  }) {
    this.model = params.model;
    this.texts = params.texts;
    // Default to the low-priority ingestion lane; only retrieval is elevated.
    this.priority = params.priority ?? EmbeddingPriority.INGESTION;
  }
}
