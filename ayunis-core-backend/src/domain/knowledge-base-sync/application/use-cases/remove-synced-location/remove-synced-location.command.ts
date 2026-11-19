import type { UUID } from 'crypto';

export class RemoveSyncedLocationCommand {
  readonly knowledgeBaseId: UUID;
  readonly locationId: UUID;

  constructor(params: { knowledgeBaseId: UUID; locationId: UUID }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.locationId = params.locationId;
  }
}
