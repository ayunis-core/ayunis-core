import { UUID } from 'crypto';

export class ToggleSkillActiveCommand {
  public readonly skillId: UUID;

  constructor(params: { skillId: UUID }) {
    this.skillId = params.skillId;
  }
}
