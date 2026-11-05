import type { UUID } from 'crypto';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';

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
}

export abstract class IndexerPort {
  abstract ingestBulk(input: IngestBulkInput): Promise<void>;
  abstract searchMulti(input: SearchMultiInput): Promise<IndexMatch[]>;
  abstract delete(documentId: UUID): Promise<void>;
  abstract deleteMany(documentIds: UUID[]): Promise<void>;
}
