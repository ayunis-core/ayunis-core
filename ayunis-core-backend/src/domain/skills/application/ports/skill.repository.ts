import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import type { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import type { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { ReadableSkillOwners } from 'src/domain/skills/application/models/skill-owner';
import type { UUID } from 'crypto';

import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface SkillListOptions {
  search?: string;
  limit: number;
  offset: number;
}

export type CollectiveOwnerRef = { teamId: UUID } | { orgId: UUID };

export interface WorkspaceSkillState {
  isActive: boolean;
  isPinned: boolean;
}

export abstract class SkillRepository {
  abstract findById(
    id: UUID,
    options?: { lock?: boolean },
  ): Promise<Skill | null>;
  abstract create(skill: PersonalSkill): Promise<PersonalSkill>;
  abstract create(skill: WorkspaceSkill): Promise<WorkspaceSkill>;
  abstract create(skill: TeamSkill): Promise<TeamSkill>;
  abstract create(skill: OrgSkill): Promise<OrgSkill>;
  abstract create(skill: Skill): Promise<Skill>;
  abstract update(
    skill: PersonalSkill,
    previous: PersonalSkill,
  ): Promise<PersonalSkill>;
  abstract update(
    skill: WorkspaceSkill,
    previous: WorkspaceSkill,
  ): Promise<WorkspaceSkill>;
  abstract update(skill: TeamSkill, previous: TeamSkill): Promise<TeamSkill>;
  abstract update(skill: OrgSkill, previous: OrgSkill): Promise<OrgSkill>;
  abstract update(skill: Skill, previous: Skill): Promise<Skill>;
  abstract delete(skillId: UUID): Promise<void>;
  abstract findOne(id: UUID, userId: UUID): Promise<PersonalSkill | null>;
  abstract findAllByOwner(userId: UUID): Promise<PersonalSkill[]>;
  abstract findPersonalByMarketplaceIdentifier(
    userId: UUID,
    marketplaceIdentifier: string,
  ): Promise<PersonalSkill | null>;
  abstract findAllByWorkspaceId(workspaceId: UUID): Promise<WorkspaceSkill[]>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
    collectiveOwners?: ReadableSkillOwners,
  ): Promise<Paginated<PersonalSkill | CollectiveSkill>>;
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
    collectiveOwners?: ReadableSkillOwners,
  ): Promise<Paginated<Skill>>;
  abstract findAllCollective(
    owners: ReadableSkillOwners,
  ): Promise<CollectiveSkill[]>;
  abstract findActiveCollective(
    owners: ReadableSkillOwners,
    name?: string,
  ): Promise<CollectiveSkill[]>;
  abstract findAllByTeamId(teamId: UUID): Promise<TeamSkill[]>;
  abstract findByNameAndCollectiveOwner(
    name: string,
    owner: CollectiveOwnerRef,
  ): Promise<CollectiveSkill | null>;
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
  abstract findAllByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Skill[]>;
  abstract findKnowledgeBaseIdsBySkillIds(skillIds: UUID[]): Promise<UUID[]>;
  /** Sources of the user's personal skills; workspace skills carry no `userId`. */
  abstract findSourceIdsByOwnerUserId(userId: UUID): Promise<UUID[]>;
  abstract removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void>;
}
