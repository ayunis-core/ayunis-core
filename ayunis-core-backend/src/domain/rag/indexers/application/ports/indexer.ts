import type { UUID } from 'crypto';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';

export interface SearchInput {
  orgId: UUID;
  documentId: UUID;
  query: string;
  filter?: {
    limit?: number;
  };
}

export interface SearchMultiInput {
  orgId: UUID;
  documentIds: UUID[];
  query: string;
  filter?: {
    limit?: number;
  };
}

export interface PrepareBulkInput {
  orgId: UUID;
  documentId: UUID;
  entries: { chunkId: UUID; content: string }[];
}

export abstract class IndexerPort {
  /** Computes the entries, including provider calls; persists nothing. */
  abstract prepareBulk(input: PrepareBulkInput): Promise<PreparedIndexContent>;
  /**
   * Atomically swaps the document's stored entries for the prepared ones,
   * joining the caller's transaction when one is active.
   */
  abstract replace(prepared: PreparedIndexContent): Promise<void>;
  abstract search(input: SearchInput): Promise<IndexEntry[]>;
  abstract searchMulti(input: SearchMultiInput): Promise<IndexEntry[]>;
  abstract delete(documentId: UUID): Promise<void>;
  abstract deleteMany(documentIds: UUID[]): Promise<void>;
}
