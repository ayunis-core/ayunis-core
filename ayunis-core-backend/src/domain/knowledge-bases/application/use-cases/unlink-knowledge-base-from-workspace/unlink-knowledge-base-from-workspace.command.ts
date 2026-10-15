import type { UUID } from 'crypto';

export class UnlinkKnowledgeBaseFromWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
