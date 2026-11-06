import type { UUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

/** MCP integrations attach to personal, team and org skills, never to workspace skills. */
export async function findSkillWithMcpIntegrations(
  repository: SkillRepository,
  skillId: UUID,
): Promise<Exclude<Skill, WorkspaceSkill>> {
  const skill = await repository.findById(skillId);
  if (!skill || skill instanceof WorkspaceSkill) {
    throw new SkillNotFoundError(skillId);
  }
  return skill;
}
