import type { UUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import type { Skill } from 'src/domain/skills/domain/skill';
import { SkillRecord } from './schema/skill.record';

export const SKILL_RELATIONS = [
  'sources',
  'mcpIntegrations',
  'knowledgeBases',
] as const;

export async function syncSkillRelation(
  manager: EntityManager,
  skillId: UUID,
  relation: 'sources' | 'mcpIntegrations' | 'knowledgeBases',
  existingIds: UUID[],
  desiredIds: UUID[],
): Promise<void> {
  const toAdd = desiredIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !desiredIds.includes(id));

  if (toAdd.length > 0) {
    await manager
      .createQueryBuilder()
      .relation(SkillRecord, relation)
      .of(skillId)
      .add(toAdd);
  }

  if (toRemove.length > 0) {
    await manager
      .createQueryBuilder()
      .relation(SkillRecord, relation)
      .of(skillId)
      .remove(toRemove);
  }
}

export async function addSkillRelations(
  repository: Repository<SkillRecord>,
  skillId: UUID,
  skill: Skill,
): Promise<void> {
  for (const [relation, ids] of [
    ['sources', skill.sourceIds],
    ['mcpIntegrations', skill.mcpIntegrationIds],
    ['knowledgeBases', skill.knowledgeBaseIds],
  ] as const) {
    if (ids.length > 0) {
      await repository
        .createQueryBuilder()
        .relation(SkillRecord, relation)
        .of(skillId)
        .add(ids);
    }
  }
}
