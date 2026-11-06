import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import type { EntityManager, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';
import { SkillRecord } from './schema/skill.record';
import type { SkillMapper } from './mappers/skill.mapper';
import {
  SKILL_RELATIONS,
  syncSkillRelation,
} from './local-skill-relations.repository-helper';

/**
 * Locks only the skill row: joining the nullable relations into
 * SELECT FOR UPDATE is not allowed.
 */
export async function lockSkillRow(
  repository: Repository<SkillRecord>,
  id: UUID,
): Promise<boolean> {
  const locked = await repository.findOne({
    where: { id },
    select: { id: true },
    lock: { mode: 'pessimistic_write' },
  });
  return locked !== null;
}

function mergeIds(current: UUID[], previous: UUID[], desired: UUID[]): UUID[] {
  const removed = new Set(previous.filter((id) => !desired.includes(id)));
  return [
    ...new Set([
      ...current.filter((id) => !removed.has(id)),
      ...desired.filter((id) => !previous.includes(id)),
    ]),
  ];
}

async function updateRelations(
  manager: EntityManager,
  current: SkillRecord,
  skill: Skill,
  previous: Skill,
): Promise<void> {
  for (const [relation, field] of [
    ['sources', 'sourceIds'],
    ['mcpIntegrations', 'mcpIntegrationIds'],
    ['knowledgeBases', 'knowledgeBaseIds'],
  ] as const) {
    const currentIds = current[relation]?.map(({ id }) => id) ?? [];
    const desired = mergeIds(currentIds, previous[field], skill[field]);
    if (relation === 'sources' && desired.length > currentIds.length) {
      assertSkillHasSourceCapacity(
        currentIds,
        desired.length - currentIds.length,
      );
    }
    await syncSkillRelation(manager, skill.id, relation, currentIds, desired);
  }
}

export async function updateSkill(
  manager: EntityManager,
  mapper: SkillMapper,
  skill: Skill,
  previous: Skill,
): Promise<Skill> {
  return manager.transaction(async (tx) => {
    const repository = tx.getRepository(SkillRecord);
    // Serialize relationship deltas and capacity checks. Only changed fields
    // belong to this write.
    if (!(await lockSkillRow(repository, skill.id))) {
      throw new SkillNotFoundError(skill.id);
    }
    const current = await repository.findOneOrFail({
      where: { id: skill.id },
      relations: [...SKILL_RELATIONS],
    });
    const changes: Partial<SkillRecord> = { updatedAt: new Date() };
    for (const field of ['name', 'shortDescription', 'instructions'] as const) {
      if (skill[field] !== previous[field]) changes[field] = skill[field];
    }
    if (skill.marketplaceIdentifier !== previous.marketplaceIdentifier) {
      changes.marketplaceIdentifier = skill.marketplaceIdentifier;
    }
    Object.assign(
      changes,
      ownerChanges(mapper, skill, previous),
      stateChanges(skill, previous),
    );
    await repository.update(skill.id, changes);
    await updateRelations(tx, current, skill, previous);
    const record = await repository.findOneOrFail({
      where: { id: skill.id },
      relations: [...SKILL_RELATIONS],
    });
    return mapper.toDomain(record);
  });
}

const OWNER_COLUMNS = ['userId', 'workspaceId', 'teamId', 'orgId'] as const;

/** Owner columns change together so the single-owner check always holds. */
function ownerChanges(
  mapper: SkillMapper,
  skill: Skill,
  previous: Skill,
): Partial<SkillRecord> {
  const next = mapper.toRecord(skill);
  const current = mapper.toRecord(previous);
  const moved = OWNER_COLUMNS.some(
    (column) => next[column] !== current[column],
  );
  if (!moved) return {};
  return Object.fromEntries(
    OWNER_COLUMNS.map((column) => [column, next[column]]),
  );
}

function stateChanges(skill: Skill, previous: Skill): Partial<SkillRecord> {
  if (!(skill instanceof AbstractCollectiveSkill)) {
    return previous instanceof AbstractCollectiveSkill
      ? { isActive: false, isPinned: false }
      : {};
  }
  if (!(previous instanceof AbstractCollectiveSkill)) {
    return { isActive: skill.isActive, isPinned: skill.isPinned };
  }
  const changes: Partial<SkillRecord> = {};
  if (skill.isActive !== previous.isActive) changes.isActive = skill.isActive;
  if (skill.isPinned !== previous.isPinned) changes.isPinned = skill.isPinned;
  return changes;
}
