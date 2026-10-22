import type { UUID } from 'crypto';

export class ListLinkableWorkspaceKnowledgeBasesQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly search?: string,
  ) {}
}
