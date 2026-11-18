import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export class PrepareContentEmbeddingsCommand {
  orgId: UUID;
  contents: string[];
  type: IndexType;
  priority?: EmbeddingPriority;

  constructor(params: {
    orgId: UUID;
    contents: string[];
    type: IndexType;
    priority?: EmbeddingPriority;
  }) {
    this.orgId = params.orgId;
    this.contents = params.contents;
    this.type = params.type;
    this.priority = params.priority;
  }
}
