import type { UUID } from 'crypto';

export class DeleteContentCommand {
  documentId: UUID;

  constructor(params: { documentId: UUID }) {
    this.documentId = params.documentId;
  }
}
