import type { UUID } from 'crypto';

export class ListKnowledgeBasesQuery {
  constructor(public readonly userId: UUID) {}
}
