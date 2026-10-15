import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class OrgSkill extends AbstractSkill {
  readonly orgId: UUID;
  readonly submittedByUserId: UUID | null;

  constructor(
    params: SkillParams & { orgId: UUID; submittedByUserId?: UUID | null },
  ) {
    super(params);
    this.orgId = params.orgId;
    this.submittedByUserId = params.submittedByUserId ?? null;
  }

  withUpdates(params: Partial<SkillParams>): OrgSkill {
    return new OrgSkill({
      ...this,
      ...params,
      orgId: this.orgId,
      submittedByUserId: this.submittedByUserId,
    });
  }
}
