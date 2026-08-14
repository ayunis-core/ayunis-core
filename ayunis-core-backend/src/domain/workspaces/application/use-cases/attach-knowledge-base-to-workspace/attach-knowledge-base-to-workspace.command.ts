import type { UUID } from 'crypto';

export class AttachKnowledgeBaseToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
