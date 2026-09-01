import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { SkillNotActiveError } from 'src/domain/skills/application/skills.errors';
import type { SkillActivationRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill-activation.record';

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
