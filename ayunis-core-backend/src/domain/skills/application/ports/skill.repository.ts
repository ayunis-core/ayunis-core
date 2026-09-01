import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface SkillListOptions {
  search?: string;
  limit: number;
  offset: number;
}

export abstract class SkillRepository {
  abstract create(skill: Skill): Promise<Skill>;
  abstract update(skill: Skill): Promise<Skill>;
  abstract delete(skillId: UUID, userId: UUID): Promise<void>;
  abstract deleteByWorkspace(skillId: UUID, workspaceId: UUID): Promise<void>;
  abstract findOne(id: UUID, userId: UUID): Promise<Skill | null>;
  abstract findAllByOwner(userId: UUID): Promise<Skill[]>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<Skill>>;
  abstract findActiveByOwner(userId: UUID): Promise<Skill[]>;
  abstract findByNameAndOwner(
    name: string,
    userId: UUID,
  ): Promise<Skill | null>;
  abstract findByNameAndWorkspace(
    name: string,
    workspaceId: UUID,
  ): Promise<Skill | null>;
  abstract activateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract deactivateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract isSkillActive(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract getActiveSkillIds(userId: UUID): Promise<Set<UUID>>;
  abstract deactivateAllExceptOwner(
    skillId: UUID,
    ownerId: UUID,
  ): Promise<void>;
  abstract deactivateUsersNotInSet(
    skillId: UUID,
    ownerId: UUID,
    retainUserIds: Set<UUID>,
  ): Promise<void>;
  abstract findByIds(ids: UUID[]): Promise<Skill[]>;
  abstract pinSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract toggleSkillPinned(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract isSkillPinned(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract getPinnedSkillIds(userId: UUID): Promise<Set<UUID>>;
  abstract findSkillsByKnowledgeBaseAndOwners(
    knowledgeBaseId: UUID,
    ownerIds: UUID[],
  ): Promise<Skill[]>;
  abstract findKnowledgeBaseIdsBySkillIds(skillIds: UUID[]): Promise<UUID[]>;
  abstract removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void>;
}
