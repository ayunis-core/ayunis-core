import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { UUID } from 'crypto';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface KnowledgeBaseListOptions {
  search?: string;
  limit: number;
  offset: number;
}

export interface KnowledgeBaseByIdsOptions {
  orgId?: UUID;
  workspaceId?: UUID | null;
}

export interface WorkspaceKnowledgeBaseState {
  isActive: boolean;
}

export abstract class KnowledgeBaseRepository {
  abstract findById(id: UUID): Promise<KnowledgeBase | null>;
  abstract findByIds(
    ids: UUID[],
    options: KnowledgeBaseByIdsOptions & { workspaceId: null },
  ): Promise<PersonalKnowledgeBase[]>;
  abstract findByIds(
    ids: UUID[],
    options: KnowledgeBaseByIdsOptions & { workspaceId: UUID },
  ): Promise<WorkspaceKnowledgeBase[]>;
  abstract findByIds(
    ids: UUID[],
    options?: KnowledgeBaseByIdsOptions,
  ): Promise<KnowledgeBase[]>;
  abstract findAllByUserId(userId: UUID): Promise<PersonalKnowledgeBase[]>;
  abstract findAllOwnedByUserId(userId: UUID): Promise<KnowledgeBase[]>;
  abstract findAllByWorkspaceId(
    workspaceId: UUID,
  ): Promise<WorkspaceKnowledgeBase[]>;
  abstract activate(knowledgeBaseId: UUID, userId: UUID): Promise<void>;
  abstract deactivate(knowledgeBaseId: UUID, userId: UUID): Promise<void>;
  abstract isActive(knowledgeBaseId: UUID, userId: UUID): Promise<boolean>;
  abstract getActiveIds(userId: UUID): Promise<Set<UUID>>;
  abstract activateForWorkspace(
    knowledgeBaseId: UUID,
    workspaceId: UUID,
  ): Promise<void>;
  abstract deactivateForWorkspace(
    knowledgeBaseId: UUID,
    workspaceId: UUID,
  ): Promise<void>;
  abstract getWorkspaceStates(
    knowledgeBaseIds: UUID[],
    workspaceId: UUID,
  ): Promise<Map<UUID, WorkspaceKnowledgeBaseState>>;
  abstract findActiveAccessible(
    userId: UUID,
    orgId: UUID,
  ): Promise<PersonalKnowledgeBase[]>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<PersonalKnowledgeBase>>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<WorkspaceKnowledgeBase>>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBase>>;
  abstract save(
    knowledgeBase: PersonalKnowledgeBase,
  ): Promise<PersonalKnowledgeBase>;
  abstract save(
    knowledgeBase: WorkspaceKnowledgeBase,
  ): Promise<WorkspaceKnowledgeBase>;
  abstract save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>;
  abstract delete(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract assignSourceToKnowledgeBase(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void>;
  abstract findSourcesByKnowledgeBaseId(
    knowledgeBaseId: UUID,
  ): Promise<Source[]>;
  abstract findSourcesByKnowledgeBaseIds(
    knowledgeBaseIds: UUID[],
  ): Promise<Source[]>;
  abstract countSourcesByKnowledgeBaseId(
    knowledgeBaseId: UUID,
  ): Promise<number>;
  abstract countSourcesByKnowledgeBaseIds(
    knowledgeBaseIds: UUID[],
  ): Promise<Map<UUID, number>>;
  abstract findSourceByIdAndKnowledgeBaseId(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<Source | null>;
}
