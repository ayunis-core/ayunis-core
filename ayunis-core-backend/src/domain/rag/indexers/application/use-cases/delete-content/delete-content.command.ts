import type { UUID } from 'crypto';
import type { IndexType } from '../../../domain/value-objects/index-type.enum';

export class DeleteContentCommand {
  documentId: UUID;
  type?: IndexType;

  constructor(params: { documentId: UUID; type?: IndexType }) {
    this.documentId = params.documentId;
    this.type = params.type;
  }
}
