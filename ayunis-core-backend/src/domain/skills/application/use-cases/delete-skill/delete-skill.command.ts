import type { UUID } from 'crypto';

export class DeleteSkillCommand {
  public readonly skillId: UUID;

  constructor(params: { skillId: UUID }) {
    this.skillId = params.skillId;
  }
}
