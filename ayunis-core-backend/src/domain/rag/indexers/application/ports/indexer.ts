import { UUID } from 'crypto';
import { IndexEntry } from '../../domain/index-entry.entity';

export interface SearchInput {
  documentId: UUID;
  query: string;
  filter?: {
    limit?: number;
  };
}

export abstract class IndexerPort {
  abstract ingest(input: IndexEntry, content: string): Promise<void>;
  abstract search(input: SearchInput): Promise<IndexEntry[]>;
  abstract delete(documentId: UUID): Promise<void>;
}
