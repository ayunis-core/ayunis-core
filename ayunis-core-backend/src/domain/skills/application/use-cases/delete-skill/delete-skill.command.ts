import type { UUID } from 'crypto';

export class DeleteSkillCommand {
  public readonly skillId: UUID;
  public readonly workspaceId?: UUID;

  constructor(params: { skillId: UUID; workspaceId?: UUID }) {
    this.skillId = params.skillId;
    this.workspaceId = params.workspaceId;
  }
}
