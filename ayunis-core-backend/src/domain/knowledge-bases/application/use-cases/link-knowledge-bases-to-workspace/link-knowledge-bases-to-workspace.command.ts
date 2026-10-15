import type { UUID } from 'crypto';

export class LinkKnowledgeBasesToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly knowledgeBaseIds: UUID[],
  ) {}
}
