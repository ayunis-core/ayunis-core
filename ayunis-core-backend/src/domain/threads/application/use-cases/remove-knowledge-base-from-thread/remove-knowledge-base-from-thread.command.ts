import type { UUID } from 'crypto';

export class RemoveKnowledgeBaseFromThreadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
