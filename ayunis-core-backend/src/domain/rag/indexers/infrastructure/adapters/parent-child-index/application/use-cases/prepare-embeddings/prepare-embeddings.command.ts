import type { UUID } from 'crypto';
import type { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export class PrepareEmbeddingsCommand {
  orgId: UUID;
  contents: string[];
  priority?: EmbeddingPriority;

  constructor(params: {
    orgId: UUID;
    contents: string[];
    priority?: EmbeddingPriority;
  }) {
    this.orgId = params.orgId;
    this.contents = params.contents;
    this.priority = params.priority;
  }
}
