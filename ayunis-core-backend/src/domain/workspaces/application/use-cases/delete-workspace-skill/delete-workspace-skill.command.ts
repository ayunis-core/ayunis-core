import type { UUID } from 'crypto';

export class DeleteWorkspaceSkillCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly skillId: UUID,
  ) {}
}
