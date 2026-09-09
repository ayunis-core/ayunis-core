import type { UUID } from 'crypto';
import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export class WorkspaceSkill extends AbstractSkill {
  readonly workspaceId: UUID;

  constructor(params: SkillParams & { workspaceId: UUID }) {
    super(params);
    this.workspaceId = params.workspaceId;
  }

  withUpdates(params: Partial<SkillParams>): WorkspaceSkill {
    return new WorkspaceSkill({
      ...this,
      ...params,
      workspaceId: this.workspaceId,
    });
  }
}
