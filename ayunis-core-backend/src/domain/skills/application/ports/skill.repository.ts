import { UUID } from 'crypto';
import { Skill } from '../../domain/skill.entity';

export abstract class SkillRepository {
  abstract create(skill: Skill): Promise<Skill>;
  abstract update(skill: Skill): Promise<Skill>;
  abstract delete(skillId: UUID, userId: UUID): Promise<void>;
  abstract findOne(id: UUID, userId: UUID): Promise<Skill | null>;
  abstract findAllByOwner(userId: UUID): Promise<Skill[]>;
  abstract findActiveByOwner(userId: UUID): Promise<Skill[]>;
  abstract findByNameAndOwner(
    name: string,
    userId: UUID,
  ): Promise<Skill | null>;
  abstract activateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract deactivateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract isSkillActive(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract getActiveSkillIds(userId: UUID): Promise<Set<UUID>>;
  abstract deactivateAllExceptOwner(
    skillId: UUID,
    ownerId: UUID,
  ): Promise<void>;
  abstract findByIds(ids: UUID[]): Promise<Skill[]>;
}
