import type { UUID } from 'crypto';

export class UnlinkSkillFromWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillId: UUID,
  ) {}
}
