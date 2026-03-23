import type { UUID } from 'crypto';
import type { IndexType } from '../../../domain/value-objects/index-type.enum';

export interface IngestBulkContentEntry {
  documentId: UUID;
  chunkId: UUID;
  content: string;
}

export class IngestBulkContentCommand {
  orgId: UUID;
  entries: IngestBulkContentEntry[];
  type: IndexType;

  constructor(params: {
    orgId: UUID;
    entries: IngestBulkContentEntry[];
    type: IndexType;
  }) {
    this.orgId = params.orgId;
    this.entries = params.entries;
    this.type = params.type;
  }
}
