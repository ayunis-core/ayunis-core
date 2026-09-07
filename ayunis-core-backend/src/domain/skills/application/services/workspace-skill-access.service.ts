import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

@Injectable()
export class WorkspaceSkillAccessService {
  constructor(private readonly repository: SkillRepository) {}

  async requireInWorkspace(
    workspaceId: UUID,
    skillId: UUID,
  ): Promise<WorkspaceSkill> {
    const skill = (await this.repository.findByIds([skillId], workspaceId)).at(
      0,
    );
    if (
      !(skill instanceof WorkspaceSkill) ||
      skill.workspaceId !== workspaceId
    ) {
      throw new SkillNotFoundError(skillId);
    }
    return skill;
  }
}
