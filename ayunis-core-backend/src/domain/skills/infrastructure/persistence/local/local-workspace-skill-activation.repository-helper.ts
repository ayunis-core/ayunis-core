import { randomUUID, type UUID } from 'crypto';
import { In, type Repository } from 'typeorm';
import { SkillNotActiveError } from 'src/domain/skills/application/skills.errors';
import type { WorkspaceSkillState } from 'src/domain/skills/application/ports/skill.repository';
import { SkillActivationRecord } from './schema/skill-activation.record';

export async function activateWorkspaceSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  workspaceId: UUID,
): Promise<void> {
  await repository
    .createQueryBuilder()
    .insert()
    .into(SkillActivationRecord)
    .values({ id: randomUUID(), skillId, workspaceId, userId: null })
    .orIgnore()
    .execute();
}

export async function deactivateWorkspaceSkill(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  workspaceId: UUID,
): Promise<void> {
  await repository.delete({ skillId, workspaceId });
}

export async function setWorkspaceSkillPinned(
  repository: Repository<SkillActivationRecord>,
  skillId: UUID,
  workspaceId: UUID,
  isPinned: boolean,
): Promise<void> {
  const result = await repository.update(
    { skillId, workspaceId },
    { isPinned },
  );
  if (isPinned && result.affected === 0) {
    throw new SkillNotActiveError(skillId);
  }
}

export async function getWorkspaceSkillStates(
  repository: Repository<SkillActivationRecord>,
  skillIds: UUID[],
  workspaceId: UUID,
): Promise<Map<UUID, WorkspaceSkillState>> {
  if (skillIds.length === 0) return new Map();
  const activations = await repository.find({
    where: { skillId: In(skillIds), workspaceId },
    select: ['skillId', 'isPinned'],
  });
  return new Map(
    activations.map((activation) => [
      activation.skillId,
      { isActive: true, isPinned: activation.isPinned },
    ]),
  );
}
