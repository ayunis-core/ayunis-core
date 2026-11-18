import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import type { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export interface IngestBulkContentEntry {
  documentId: UUID;
  chunkId: UUID;
  content: string;
}

export class IngestBulkContentCommand {
  orgId: UUID;
  entries: IngestBulkContentEntry[];
  type: IndexType;
  /** Result of PrepareContentEmbeddingsUseCase for (some of) the entries. */
  precomputedEmbeddings?: PreparedContentEmbeddings;
  /** Throttle lane of the embedding calls; ingestion when omitted. */
  priority?: EmbeddingPriority;

  constructor(params: {
    orgId: UUID;
    entries: IngestBulkContentEntry[];
    type: IndexType;
    precomputedEmbeddings?: PreparedContentEmbeddings;
    priority?: EmbeddingPriority;
  }) {
    this.orgId = params.orgId;
    this.entries = params.entries;
    this.type = params.type;
    this.precomputedEmbeddings = params.precomputedEmbeddings;
    this.priority = params.priority;
  }
}
