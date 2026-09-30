import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';

export interface PrepareBulkContentEntry {
  chunkId: UUID;
  content: string;
}

export class PrepareBulkContentCommand {
  orgId: UUID;
  documentId: UUID;
  entries: PrepareBulkContentEntry[];
  type: IndexType;

  constructor(params: {
    orgId: UUID;
    documentId: UUID;
    entries: PrepareBulkContentEntry[];
    type: IndexType;
  }) {
    this.orgId = params.orgId;
    this.documentId = params.documentId;
    this.entries = params.entries;
    this.type = params.type;
  }
}
