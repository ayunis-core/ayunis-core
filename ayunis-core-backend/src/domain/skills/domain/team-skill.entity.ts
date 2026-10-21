import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class TeamSkill extends AbstractSkill {
  readonly teamId: UUID;
  readonly orgId: UUID;
  readonly submittedByUserId: UUID | null;

  constructor(
    params: SkillParams & {
      teamId: UUID;
      orgId: UUID;
      submittedByUserId?: UUID | null;
    },
  ) {
    super(params);
    this.teamId = params.teamId;
    this.orgId = params.orgId;
    this.submittedByUserId = params.submittedByUserId ?? null;
  }

  withUpdates(params: Partial<SkillParams>): TeamSkill {
    return new TeamSkill({
      ...this,
      ...params,
      teamId: this.teamId,
      orgId: this.orgId,
      submittedByUserId: this.submittedByUserId,
    });
  }
}
