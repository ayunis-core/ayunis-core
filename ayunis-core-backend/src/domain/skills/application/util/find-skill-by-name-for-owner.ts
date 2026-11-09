import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

/** Skill names are unique per owner; finds the skill holding `name` for the owner of `skill`. */
export function findSkillByNameForOwner(
  repository: SkillRepository,
  skill: Skill,
  name: string,
): Promise<Skill | null> {
  if (skill instanceof PersonalSkill) {
    return repository.findByNameAndOwner(name, skill.userId);
  }
  if (skill instanceof WorkspaceSkill) {
    return repository.findByNameAndWorkspace(name, skill.workspaceId);
  }
  if (skill instanceof TeamSkill) {
    return repository.findByNameAndCollectiveOwner(name, {
      teamId: skill.teamId,
    });
  }
  if (skill instanceof OrgSkill) {
    return repository.findByNameAndCollectiveOwner(name, {
      orgId: skill.orgId,
    });
  }
  const unknown: never = skill;
  throw new Error(`Unknown skill owner: ${String(unknown)}`);
}
