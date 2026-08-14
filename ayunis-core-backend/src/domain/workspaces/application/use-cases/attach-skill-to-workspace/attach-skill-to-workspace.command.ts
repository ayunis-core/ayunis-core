import type { UUID } from 'crypto';

export class AttachSkillToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillId: UUID,
  ) {}
}
