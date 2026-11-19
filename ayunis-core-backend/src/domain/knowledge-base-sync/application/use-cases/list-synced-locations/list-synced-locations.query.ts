import type { UUID } from 'crypto';

export class ListSyncedLocationsQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
