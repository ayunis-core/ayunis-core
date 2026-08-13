import type { UUID } from 'crypto';

export class DetachSkillFromWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillId: UUID,
  ) {}
}
