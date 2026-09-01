import type { UUID } from 'crypto';

export class CreateWorkspaceKnowledgeBaseCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly name: string,
    public readonly description: string,
  ) {}
}
