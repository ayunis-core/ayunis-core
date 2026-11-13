import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';

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

  constructor(params: {
    orgId: UUID;
    entries: IngestBulkContentEntry[];
    type: IndexType;
    precomputedEmbeddings?: PreparedContentEmbeddings;
  }) {
    this.orgId = params.orgId;
    this.entries = params.entries;
    this.type = params.type;
    this.precomputedEmbeddings = params.precomputedEmbeddings;
  }
}
