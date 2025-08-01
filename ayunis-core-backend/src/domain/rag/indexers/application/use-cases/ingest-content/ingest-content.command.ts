import { UUID } from 'crypto';
import { IndexType } from '../../../domain/value-objects/index-type.enum';

export class IngestContentCommand {
  documentId: UUID;
  chunkId: UUID;
  content: string;
  type: IndexType;

  constructor(params: {
    documentId: UUID;
    chunkId: UUID;
    content: string;
    type: IndexType;
  }) {
    this.documentId = params.documentId;
    this.chunkId = params.chunkId;
    this.content = params.content;
    this.type = params.type;
  }
}
