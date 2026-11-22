import type { UUID } from 'crypto';

export class AssertKnowledgeBaseWriteAccessQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
