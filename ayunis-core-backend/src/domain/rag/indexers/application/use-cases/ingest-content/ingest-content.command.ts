import { UUID } from 'crypto';
import { IndexType } from '../../../domain/value-objects/index-type.enum';

export class IngestContentCommand {
  orgId: UUID;
  documentId: UUID;
  chunkId: UUID;
  content: string;
  type: IndexType;

  constructor(params: {
    orgId: UUID;
    documentId: UUID;
    chunkId: UUID;
    content: string;
    type: IndexType;
  }) {
    this.orgId = params.orgId;
    this.documentId = params.documentId;
    this.chunkId = params.chunkId;
    this.content = params.content;
    this.type = params.type;
  }
}
