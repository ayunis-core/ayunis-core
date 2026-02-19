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

export interface IngestInput {
  orgId: UUID;
  indexEntry: IndexEntry;
  content: string;
}

export abstract class IndexerPort {
  abstract ingest(input: IngestInput): Promise<void>;
  abstract search(input: SearchInput): Promise<IndexEntry[]>;
  abstract delete(documentId: UUID): Promise<void>;
  abstract deleteMany(documentIds: UUID[]): Promise<void>;
}
