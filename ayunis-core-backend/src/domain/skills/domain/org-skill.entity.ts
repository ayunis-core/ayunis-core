import type { UUID } from 'crypto';
import {
  AbstractCollectiveSkill,
  type CollectiveSkillParams,
} from './collective-skill.entity';

export class OrgSkill extends AbstractCollectiveSkill {
  readonly orgId: UUID;

  constructor(params: CollectiveSkillParams & { orgId: UUID }) {
    super(params);
    this.orgId = params.orgId;
  }

  withUpdates(params: Partial<CollectiveSkillParams>): OrgSkill {
    return new OrgSkill({ ...this, ...params, orgId: this.orgId });
  }
}
