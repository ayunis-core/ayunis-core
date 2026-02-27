import type { UUID } from 'crypto';

export class GetKnowledgeBasesByIdsQuery {
  constructor(public readonly knowledgeBaseIds: UUID[]) {}
}
