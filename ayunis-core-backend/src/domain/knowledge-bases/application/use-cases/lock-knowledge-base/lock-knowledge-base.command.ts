import type { UUID } from 'crypto';

export class LockKnowledgeBaseCommand {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
