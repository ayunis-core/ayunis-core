import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class IndexEntry {
  id: UUID;
  relatedDocumentId: UUID;
  relatedChunkId: UUID;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    relatedDocumentId: UUID;
    relatedChunkId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.relatedDocumentId = params.relatedDocumentId;
    this.relatedChunkId = params.relatedChunkId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
