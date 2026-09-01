import type { UUID } from 'crypto';

export class CopyPersonalKnowledgeBaseToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
