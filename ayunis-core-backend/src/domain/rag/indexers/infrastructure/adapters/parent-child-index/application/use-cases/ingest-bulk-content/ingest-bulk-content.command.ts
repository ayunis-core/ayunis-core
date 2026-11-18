import type { UUID } from 'crypto';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import type { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export interface IngestBulkEntry {
  indexEntry: IndexEntry;
  content: string;
}

export class IngestBulkContentCommand {
  orgId: UUID;
  entries: IngestBulkEntry[];
  /** Vectors by embedded text, from PrepareEmbeddingsUseCase. */
  precomputedEmbeddings?: PreparedContentEmbeddings;
  priority?: EmbeddingPriority;

  constructor(params: {
    orgId: UUID;
    entries: IngestBulkEntry[];
    precomputedEmbeddings?: PreparedContentEmbeddings;
    priority?: EmbeddingPriority;
  }) {
    this.orgId = params.orgId;
    this.entries = params.entries;
    this.precomputedEmbeddings = params.precomputedEmbeddings;
    this.priority = params.priority;
  }
}
