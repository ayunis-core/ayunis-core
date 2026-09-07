import { randomUUID, type UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { SkillActivationRecord } from './schema/skill-activation.record';

export async function activateSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<void> {
  await repository
    .createQueryBuilder()
    .insert()
    .into(SkillActivationRecord)
    .values({ id: randomUUID(), skillId, userId })
    .orIgnore()
    .execute();
}

export async function deactivateSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<void> {
  await repository.delete({ skillId, userId });
}

export async function deactivateAllExceptOwner(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  ownerId: UUID,
): Promise<void> {
  await repository
    .createQueryBuilder()
    .delete()
    .from(SkillActivationRecord)
    .where('skillId = :skillId', { skillId })
    .andWhere('userId != :ownerId', { ownerId })
    .execute();
}

export async function deactivateUsersNotInSet(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  ownerId: UUID,
  retainUserIds: Set<UUID>,
): Promise<void> {
  const keepIds = [ownerId, ...retainUserIds];
  await repository
    .createQueryBuilder()
    .delete()
    .from(SkillActivationRecord)
    .where('skillId = :skillId', { skillId })
    .andWhere('userId NOT IN (:...keepIds)', { keepIds })
    .execute();
}

export async function isSkillActive(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<boolean> {
  return (await repository.count({ where: { skillId, userId } })) > 0;
}

export async function getActiveSkillIds(
  repository: Repository<SkillActivationRecord>,
  userId: UUID,
): Promise<Set<UUID>> {
  const activations = await repository.find({
    where: { userId },
    select: ['skillId'],
  });
  return new Set(activations.map(({ skillId }) => skillId));
}
