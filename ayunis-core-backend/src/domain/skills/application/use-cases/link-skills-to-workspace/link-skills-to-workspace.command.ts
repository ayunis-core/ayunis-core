import type { UUID } from 'crypto';

export class LinkSkillsToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillIds: UUID[],
  ) {}
}
