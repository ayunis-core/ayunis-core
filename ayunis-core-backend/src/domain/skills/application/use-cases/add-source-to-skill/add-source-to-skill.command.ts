import type { UUID } from 'crypto';

export class AddSourceToSkillCommand {
  public readonly skillId: UUID;
  public readonly sourceId: UUID;

  constructor(params: { skillId: UUID; sourceId: UUID }) {
    this.skillId = params.skillId;
    this.sourceId = params.sourceId;
  }
}
