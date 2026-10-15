import {
  ORG_PREFIX,
  TEAM_PREFIX,
  USER_PREFIX,
  WORKSPACE_PREFIX,
  type SkillPrefix,
} from 'src/common/util/skill-slug';
import { OrgSkill } from './org-skill.entity';
import type { Skill } from './skill';
import { TeamSkill } from './team-skill.entity';
import { WorkspaceSkill } from './workspace-skill.entity';

export function skillSlugPrefix(skill: Skill): SkillPrefix {
  if (skill instanceof WorkspaceSkill) return WORKSPACE_PREFIX;
  if (skill instanceof TeamSkill) return TEAM_PREFIX;
  if (skill instanceof OrgSkill) return ORG_PREFIX;
  return USER_PREFIX;
}

export function skillSlugName(skill: Skill): string {
  if (skill instanceof TeamSkill) {
    return `${skill.name} ${skill.teamId.slice(0, 8)}`;
  }
  return skill.name;
}
