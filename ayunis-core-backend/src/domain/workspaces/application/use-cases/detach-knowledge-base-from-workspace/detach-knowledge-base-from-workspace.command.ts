import type { UUID } from 'crypto';

export class DetachKnowledgeBaseFromWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
