import type { UUID } from 'crypto';
import type { IndexEntry } from '../../domain/index-entry.entity';

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

export interface IngestBulkInput {
  orgId: UUID;
  entries: { indexEntry: IndexEntry; content: string }[];
}

export abstract class IndexerPort {
  abstract ingestBulk(input: IngestBulkInput): Promise<void>;
  abstract search(input: SearchInput): Promise<IndexEntry[]>;
  abstract searchMulti(input: SearchMultiInput): Promise<IndexEntry[]>;
  abstract delete(documentId: UUID): Promise<void>;
  abstract deleteMany(documentIds: UUID[]): Promise<void>;
}
