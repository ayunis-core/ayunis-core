import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

export function isSameOwner(
  skill: Skill,
  knowledgeBase: KnowledgeBase,
): boolean {
  if (skill instanceof PersonalSkill) {
    return (
      knowledgeBase instanceof PersonalKnowledgeBase &&
      knowledgeBase.userId === skill.userId
    );
  }
  if (skill instanceof WorkspaceSkill) {
    return (
      knowledgeBase instanceof WorkspaceKnowledgeBase &&
      knowledgeBase.workspaceId === skill.workspaceId
    );
  }
  if (skill instanceof TeamSkill) {
    return (
      knowledgeBase instanceof TeamKnowledgeBase &&
      knowledgeBase.teamId === skill.teamId
    );
  }
  return (
    skill instanceof OrgSkill &&
    knowledgeBase instanceof OrgKnowledgeBase &&
    knowledgeBase.orgId === skill.orgId
  );
}
