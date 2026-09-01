import type { UUID } from 'crypto';

export class CopyPersonalSkillToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillId: UUID,
  ) {}
}
