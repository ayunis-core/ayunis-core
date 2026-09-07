import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { SkillNotActiveError } from 'src/domain/skills/application/skills.errors';
import { SkillActivationRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill-activation.record';

export async function pinSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<void> {
  const result = await repository
    .createQueryBuilder()
    .update(SkillActivationRecord)
    .set({ isPinned: true })
    .where('"skillId" = :skillId AND "userId" = :userId', { skillId, userId })
    .execute();
  if (result.affected === 0) throw new SkillNotActiveError(skillId);
}

export async function togglePinnedSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<boolean> {
  const rows: Array<{ isPinned: boolean }> = await repository.query(
    `UPDATE skill_activations SET "isPinned" = NOT "isPinned"
       WHERE "skillId" = $1 AND "userId" = $2
       RETURNING "isPinned"`,
    [skillId, userId],
  );
  if (rows.length === 0) throw new SkillNotActiveError(skillId);
  return rows[0].isPinned;
}

export async function isSkillPinned(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  userId: UUID,
): Promise<boolean> {
  return (
    (await repository.count({
      where: { skillId, userId, isPinned: true },
    })) > 0
  );
}

export async function getPinnedSkillIds(
  repository: Repository<SkillActivationRecord>,
  userId: UUID,
): Promise<Set<UUID>> {
  const activations = await repository.find({
    where: { userId, isPinned: true },
    select: ['skillId'],
  });
  return new Set(activations.map(({ skillId }) => skillId));
}
