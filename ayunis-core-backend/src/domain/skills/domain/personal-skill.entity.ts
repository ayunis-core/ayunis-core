import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class PersonalSkill extends AbstractSkill {
  readonly userId: UUID;

  constructor(params: SkillParams & { userId: UUID }) {
    super(params);
    this.userId = params.userId;
  }

  withUpdates(params: Partial<SkillParams>): PersonalSkill {
    return new PersonalSkill({ ...this, ...params, userId: this.userId });
  }
}
