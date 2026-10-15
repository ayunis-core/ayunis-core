import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class OrgSkill extends AbstractSkill {
  readonly orgId: UUID;

  constructor(params: SkillParams & { orgId: UUID }) {
    super(params);
    this.orgId = params.orgId;
  }

  withUpdates(params: Partial<SkillParams>): OrgSkill {
    return new OrgSkill({ ...this, ...params, orgId: this.orgId });
  }
}
