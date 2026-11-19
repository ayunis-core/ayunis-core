import type { UUID } from 'crypto';

export class AssertKnowledgeBaseReadAccessQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
