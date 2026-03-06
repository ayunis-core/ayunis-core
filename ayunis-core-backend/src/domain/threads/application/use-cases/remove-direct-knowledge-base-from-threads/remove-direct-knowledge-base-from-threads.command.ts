import type { UUID } from 'crypto';

export class RemoveDirectKnowledgeBaseFromThreadsCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly userIds: UUID[],
  ) {}
}
