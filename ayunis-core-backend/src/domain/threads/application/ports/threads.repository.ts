import type { SourceAssignment } from '../../domain/thread-source-assignment.entity';
import type { Thread } from '../../domain/thread.entity';
import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface ThreadsFindAllOptions {
  withSources?: boolean;
  withMessages?: boolean;
  withModel?: boolean;
  withKnowledgeBases?: boolean;
}

export interface ThreadsFindAllFilters {
  search?: string;
  workspaceId?: UUID;
}

export interface ThreadsPagination {
  limit: number;
  offset: number;
}

/** Minimal thread reference used by data-retention enforcement. */
export interface ExpiredThreadRef {
  id: UUID;
  userId: UUID;
}

export interface FindExpiredThreadRefsParams {
  orgId: UUID;
  /** Threads whose last activity is strictly before this are expired. */
  activeBefore: Date;
  limit: number;
  offset: number;
}

export interface StaleThreadSourceRef {
  sourceId: UUID;
  orgId: UUID;
}

export abstract class ThreadsRepository {
  abstract create(thread: Thread): Promise<Thread>;
  abstract findOne(id: UUID, userId: UUID): Promise<Thread | null>;
  abstract findAllByIds(userId: UUID, ids: UUID[]): Promise<Thread[]>;
  abstract findAll(
    userId: UUID,
    options?: ThreadsFindAllOptions,
    filters?: ThreadsFindAllFilters,
    pagination?: ThreadsPagination,
  ): Promise<Paginated<Thread>>;
  abstract findAllByModel(
    modelId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract update(thread: Thread): Promise<Thread>;
  abstract updateModel(params: {
    threadId: UUID;
    userId: UUID;
    permittedModelId: UUID;
  }): Promise<void>;
  abstract updateTitle(params: {
    threadId: UUID;
    userId: UUID;
    title: string;
  }): Promise<void>;
  /**
   * Bumps the thread's last-activity timestamp. Best-effort and scoped by
   * threadId only (no userId): it is driven by the message-added event, which
   * carries no per-call ownership guarantee. A no-op if the thread is gone.
   */
  abstract updateLastActivityAt(params: {
    threadId: UUID;
    lastActivityAt: Date;
  }): Promise<void>;
  abstract addSourceAssignment(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignment: SourceAssignment;
  }): Promise<void>;
  abstract updateMcpIntegrations(params: {
    threadId: UUID;
    userId: UUID;
    mcpIntegrationIds: UUID[];
  }): Promise<void>;
  abstract addKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void>;
  abstract removeKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void>;
  /**
   * `workspaceId: null` detaches the thread from its workspace.
   * Throws `ThreadNotFoundError` when the user owns no such thread. Filing a
   * chat is treated as an edit and bumps `updatedAt`.
   */
  abstract assignToWorkspace(params: {
    threadId: UUID;
    userId: UUID;
    workspaceId: UUID | null;
  }): Promise<void>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
  abstract findAllIdsByUserId(userId: UUID): Promise<UUID[]>;
  abstract findAllIdsByWorkspaceId(workspaceId: UUID): Promise<UUID[]>;
  /** Returns the subset of the given ids whose thread rows still exist. */
  abstract filterExistingIds(threadIds: UUID[]): Promise<UUID[]>;
  abstract findAllByOrgIdWithSources(orgId: UUID): Promise<Thread[]>;
  /**
   * Returns a page of expired thread references (id + owner) for an org,
   * oldest-activity first. Activity is `lastActivityAt`, falling back to
   * `createdAt` defensively. Used by data-retention enforcement.
   */
  abstract findExpiredThreadRefsByOrg(
    params: FindExpiredThreadRefsParams,
  ): Promise<ExpiredThreadRef[]>;
  abstract removeSourceAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
  }): Promise<void>;
  abstract removeKnowledgeBaseAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
    knowledgeBaseId?: UUID;
  }): Promise<void>;
  abstract removeDirectKnowledgeBaseAssignments(params: {
    knowledgeBaseId: UUID;
    userIds: UUID[];
  }): Promise<void>;
  /**
   * Returns source and owning-org IDs where (a) at least one direct
   * (non-skill) thread
   * assignment exists and (b) every such direct assignment points to a
   * thread whose messages are all older than `olderThan`. Empty threads do
   * NOT count as stale — they keep the source alive. The caller is
   * responsible for filtering out sources still referenced by other domains
   * (skills, knowledge bases) before deletion.
   */
  abstract findSourcesWithOnlyStaleDirectAssignments(
    olderThan: Date,
  ): Promise<StaleThreadSourceRef[]>;
}
