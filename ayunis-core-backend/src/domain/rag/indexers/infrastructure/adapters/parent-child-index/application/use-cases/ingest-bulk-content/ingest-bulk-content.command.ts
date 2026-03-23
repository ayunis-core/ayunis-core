import type { UUID } from 'crypto';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';

export interface IngestBulkEntry {
  indexEntry: IndexEntry;
  content: string;
}

export class IngestBulkContentCommand {
  orgId: UUID;
  entries: IngestBulkEntry[];

  constructor(params: { orgId: UUID; entries: IngestBulkEntry[] }) {
    this.orgId = params.orgId;
    this.entries = params.entries;
  }
}
