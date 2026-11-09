import type { UUID } from 'crypto';
import { In, IsNull, Not, type Repository } from 'typeorm';
import { SKILL_RELATIONS } from 'src/domain/skills/infrastructure/persistence/local/local-skill-relations.repository-helper';
import type { SkillActivationRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill-activation.record';
import type { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

/** `workspaceId: null` limits the lookup to personal skills. */
export function findSkillRecordsByIds(
  repository: Repository<SkillRecord>,
  ids: UUID[],
  workspaceId?: UUID | null,
): Promise<SkillRecord[]> {
  return repository.find({
    where: {
      id: In([...new Set(ids)]),
      ...(workspaceId === null
        ? { workspaceId: IsNull(), userId: Not(IsNull()) }
        : {}),
      ...(workspaceId ? { workspaceId } : {}),
    },
    relations: [...SKILL_RELATIONS],
  });
}

export async function findSourceIdsOwnedByUser(
  repository: Repository<SkillRecord>,
  userId: UUID,
): Promise<UUID[]> {
  const rows = await repository
    .createQueryBuilder('skill')
    .innerJoin('skill.sources', 'source')
    .select('DISTINCT source.id', 'sourceId')
    .where('skill.userId = :userId', { userId })
    .getRawMany<{ sourceId: UUID }>();
  return rows.map((row) => row.sourceId);
}

export async function findActivePersonalSkillRecords(
  skills: Repository<SkillRecord>,
  activations: Repository<SkillActivationRecord>,
  userId: UUID,
): Promise<SkillRecord[]> {
  const rows = await activations.find({
    where: { userId },
    select: ['skillId'],
  });
  if (rows.length === 0) return [];
  return skills.find({
    where: {
      id: In(rows.map((row) => row.skillId)),
      userId,
      workspaceId: IsNull(),
    },
    relations: [...SKILL_RELATIONS],
  });
}
