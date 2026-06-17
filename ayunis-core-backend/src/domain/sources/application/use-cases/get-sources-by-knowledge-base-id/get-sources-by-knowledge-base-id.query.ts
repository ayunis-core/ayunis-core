import type { UUID } from 'crypto';

export class GetSourcesByKnowledgeBaseIdQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
