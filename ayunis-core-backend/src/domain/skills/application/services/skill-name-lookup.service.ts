import { Injectable } from '@nestjs/common';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

@Injectable()
export class SkillNameLookupService {
  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
  ) {}

  findSameOwnerByName(skill: Skill, name: string): Promise<Skill | null> {
    if (skill instanceof PersonalSkill) {
      return this.repository.findByNameAndOwner(name, skill.userId);
    }
    if (skill instanceof WorkspaceSkill) {
      return this.repository.findByNameAndWorkspace(name, skill.workspaceId);
    }
    if (skill instanceof TeamSkill) {
      return this.collectiveRepository.findByNameAndTeam(name, skill.teamId);
    }
    return this.collectiveRepository.findByNameAndOrg(name, skill.orgId);
  }
}
