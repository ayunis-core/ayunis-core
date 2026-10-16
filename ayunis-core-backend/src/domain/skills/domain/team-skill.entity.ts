import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class TeamSkill extends AbstractSkill {
  readonly teamId: UUID;
  readonly orgId: UUID;

  constructor(params: SkillParams & { teamId: UUID; orgId: UUID }) {
    super(params);
    this.teamId = params.teamId;
    this.orgId = params.orgId;
  }

  withUpdates(params: Partial<SkillParams>): TeamSkill {
    return new TeamSkill({
      ...this,
      ...params,
      teamId: this.teamId,
      orgId: this.orgId,
    });
  }
}
