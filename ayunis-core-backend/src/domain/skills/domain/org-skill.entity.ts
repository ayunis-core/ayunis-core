import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class OrgSkill extends AbstractSkill {
  readonly orgId: UUID;
  readonly submittedByUserId: UUID | null;
  readonly isMandatory: boolean;

  constructor(
    params: SkillParams & {
      orgId: UUID;
      submittedByUserId?: UUID | null;
      isMandatory?: boolean;
    },
  ) {
    super(params);
    this.orgId = params.orgId;
    this.submittedByUserId = params.submittedByUserId ?? null;
    this.isMandatory = params.isMandatory ?? false;
  }

  withUpdates(params: Partial<SkillParams>): OrgSkill {
    return new OrgSkill({
      ...this,
      ...params,
      orgId: this.orgId,
      submittedByUserId: this.submittedByUserId,
      isMandatory: this.isMandatory,
    });
  }

  withMandatory(isMandatory: boolean): OrgSkill {
    return new OrgSkill({ ...this, isMandatory });
  }
}
