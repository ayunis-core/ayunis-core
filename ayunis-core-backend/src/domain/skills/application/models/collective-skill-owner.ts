import type { CollectiveOwner } from 'src/domain/ownership/application/models/collective-owner';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';

export function isCollectiveSkill(skill: Skill): skill is CollectiveSkill {
  return skill instanceof TeamSkill || skill instanceof OrgSkill;
}

export function collectiveOwnerOf(skill: CollectiveSkill): CollectiveOwner {
  return skill instanceof TeamSkill
    ? { type: 'team', teamId: skill.teamId, orgId: skill.orgId }
    : { type: 'org', orgId: skill.orgId };
}
