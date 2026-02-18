import type { UUID } from 'crypto';

export class DeleteContentsCommand {
  documentIds: UUID[];

  constructor(params: { documentIds: UUID[] }) {
    this.documentIds = params.documentIds;
  }
}
