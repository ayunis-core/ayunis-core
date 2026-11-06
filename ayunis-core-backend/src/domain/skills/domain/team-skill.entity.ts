import type { UUID } from 'crypto';
import {
  AbstractCollectiveSkill,
  type CollectiveSkillParams,
} from './collective-skill.entity';

export class TeamSkill extends AbstractCollectiveSkill {
  readonly teamId: UUID;

  constructor(params: CollectiveSkillParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }

  withUpdates(params: Partial<CollectiveSkillParams>): TeamSkill {
    return new TeamSkill({ ...this, ...params, teamId: this.teamId });
  }
}
