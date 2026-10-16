import type { UUID } from 'crypto';

export class ListLinkedWorkspaceKnowledgeBasesQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly search?: string,
  ) {}
}
