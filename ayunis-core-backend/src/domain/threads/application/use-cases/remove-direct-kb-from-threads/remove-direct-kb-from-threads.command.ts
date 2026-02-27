import type { UUID } from 'crypto';

export class RemoveDirectKbFromThreadsCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly userIds: UUID[],
  ) {}
}
