import type { UUID } from 'crypto';

export interface PrepareBulkEntry {
  chunkId: UUID;
  content: string;
}

export class PrepareBulkContentCommand {
  orgId: UUID;
  documentId: UUID;
  entries: PrepareBulkEntry[];

  constructor(params: {
    orgId: UUID;
    documentId: UUID;
    entries: PrepareBulkEntry[];
  }) {
    this.orgId = params.orgId;
    this.documentId = params.documentId;
    this.entries = params.entries;
  }
}
