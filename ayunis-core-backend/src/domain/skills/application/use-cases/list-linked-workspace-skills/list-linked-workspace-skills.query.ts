import type { UUID } from 'crypto';

export class ListLinkedWorkspaceSkillsQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly search?: string,
  ) {}
}
