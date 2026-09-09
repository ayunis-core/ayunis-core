import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { UUID } from 'crypto';

import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface SkillListOptions {
  search?: string;
  limit: number;
  offset: number;
}

export interface WorkspaceSkillState {
  isActive: boolean;
  isPinned: boolean;
}

export abstract class SkillRepository {
  abstract findById(id: UUID): Promise<Skill | null>;
  abstract create(skill: PersonalSkill): Promise<PersonalSkill>;
  abstract create(skill: WorkspaceSkill): Promise<WorkspaceSkill>;
  abstract create(skill: Skill): Promise<Skill>;
  abstract update(
    skill: PersonalSkill,
    previous: PersonalSkill,
  ): Promise<PersonalSkill>;
  abstract update(
    skill: WorkspaceSkill,
    previous: WorkspaceSkill,
  ): Promise<WorkspaceSkill>;
  abstract update(skill: Skill, previous: Skill): Promise<Skill>;
  abstract delete(skillId: UUID): Promise<void>;
  abstract findOne(id: UUID, userId: UUID): Promise<PersonalSkill | null>;
  abstract findAllByOwner(userId: UUID): Promise<PersonalSkill[]>;
  abstract findAllByWorkspaceId(workspaceId: UUID): Promise<WorkspaceSkill[]>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<PersonalSkill>>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<WorkspaceSkill>>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<Skill>>;
  abstract findActiveByOwner(userId: UUID): Promise<PersonalSkill[]>;
  abstract findByNameAndOwner(
    name: string,
    userId: UUID,
  ): Promise<PersonalSkill | null>;
  abstract findByNameAndWorkspace(
    name: string,
    workspaceId: UUID,
  ): Promise<WorkspaceSkill | null>;
  abstract activateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract deactivateSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract isSkillActive(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract getActiveSkillIds(userId: UUID): Promise<Set<UUID>>;
  abstract activateWorkspaceSkill(
    skillId: UUID,
    workspaceId: UUID,
  ): Promise<void>;
  abstract deactivateWorkspaceSkill(
    skillId: UUID,
    workspaceId: UUID,
  ): Promise<void>;
  abstract setWorkspaceSkillPinned(
    skillId: UUID,
    workspaceId: UUID,
    isPinned: boolean,
  ): Promise<void>;
  abstract getWorkspaceSkillStates(
    skillIds: UUID[],
    workspaceId: UUID,
  ): Promise<Map<UUID, WorkspaceSkillState>>;
  abstract deactivateAllExceptOwner(
    skillId: UUID,
    ownerId: UUID,
  ): Promise<void>;
  abstract deactivateUsersNotInSet(
    skillId: UUID,
    ownerId: UUID,
    retainUserIds: Set<UUID>,
  ): Promise<void>;
  abstract findByIds(ids: UUID[], workspaceId: null): Promise<PersonalSkill[]>;
  abstract findByIds(ids: UUID[], workspaceId: UUID): Promise<WorkspaceSkill[]>;
  abstract findByIds(ids: UUID[], workspaceId?: UUID | null): Promise<Skill[]>;
  abstract pinSkill(skillId: UUID, userId: UUID): Promise<void>;
  abstract setSkillPinned(
    skillId: UUID,
    userId: UUID,
    isPinned: boolean,
  ): Promise<void>;
  abstract isSkillPinned(skillId: UUID, userId: UUID): Promise<boolean>;
  abstract getPinnedSkillIds(userId: UUID): Promise<Set<UUID>>;
  abstract findSkillsByKnowledgeBaseAndOwners(
    knowledgeBaseId: UUID,
    ownerIds: UUID[],
  ): Promise<PersonalSkill[]>;
  abstract findKnowledgeBaseIdsBySkillIds(skillIds: UUID[]): Promise<UUID[]>;
  abstract removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void>;
}
