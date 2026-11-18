import type { UUID } from 'crypto';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import type { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

export interface SearchMultiInput {
  orgId: UUID;
  documentIds: UUID[];
  queries: string[];
  filter?: {
    /** Maximum matches per query, before merging across queries. */
    limit?: number;
  };
}

export interface IngestBulkInput {
  orgId: UUID;
  entries: { indexEntry: IndexEntry; content: string }[];
  /** Result of prepareEmbeddings for (some of) these contents. */
  precomputedEmbeddings?: PreparedContentEmbeddings;
  priority?: EmbeddingPriority;
}

export interface PrepareEmbeddingsInput {
  orgId: UUID;
  contents: string[];
  priority?: EmbeddingPriority;
}

export abstract class IndexerPort {
  /** Returns the catalog ID of the embedding model the entries are indexed with. */
  abstract ingestBulk(input: IngestBulkInput): Promise<UUID>;
  /**
   * Computes the vectors an ingestion of these contents would need, keyed
   * by embedded text, without storing anything.
   */
  abstract prepareEmbeddings(
    input: PrepareEmbeddingsInput,
  ): Promise<PreparedContentEmbeddings | undefined>;
  abstract searchMulti(input: SearchMultiInput): Promise<IndexMatch[]>;
  abstract delete(documentId: UUID): Promise<void>;
  abstract deleteMany(documentIds: UUID[]): Promise<void>;
}
