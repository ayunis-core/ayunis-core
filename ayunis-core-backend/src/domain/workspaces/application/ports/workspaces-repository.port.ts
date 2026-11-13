import type { UUID } from 'crypto';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export type WorkspaceSortKey = 'updatedAt' | 'createdAt' | 'name';

export interface WorkspaceListOptions {
  search?: string;
  sort: WorkspaceSortKey;
  limit: number;
  offset: number;
}

export interface WorkspaceListStats {
  chatCount: number;
  lastActivityAt: Date | null;
  skillCount: number;
  knowledgeBaseCount: number;
}

export interface WorkspaceKnowledgeBaseRef {
  id: UUID;
  name: string;
  description: string | null;
  documentCount: number;
  isActive: boolean;
}

export interface WorkspaceContextRefs {
  skillIds: UUID[];
  knowledgeBases: WorkspaceKnowledgeBaseRef[];
}

/**
 * Lookups taking a `userId` only return workspaces the user is a member of.
 */
export abstract class WorkspacesRepository {
  /** Ordered by the workspace's last update, newest first. */
  abstract findAllByUserId(
    userId: UUID,
    query: WorkspaceListOptions,
  ): Promise<Paginated<Workspace>>;
  abstract findAllByIds(userId: UUID, ids: UUID[]): Promise<Workspace[]>;
  abstract findMemberless(ids: UUID[]): Promise<Workspace[]>;

  /**
   * The user's own chat count and latest chat activity plus the skill and
   * knowledge-base counts per workspace, for the list page. Chats are private
   * to their creator, so other members' chats are not counted. Missing
   * entries mean "nothing yet".
   */
  abstract getListStats(
    userId: UUID,
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceListStats>>;
  abstract findById(userId: UUID, id: UUID): Promise<Workspace | null>;
  abstract save(workspace: Workspace): Promise<Workspace>;
  abstract getContextRefs(workspaceId: UUID): Promise<WorkspaceContextRefs>;
  /** Throws `WorkspaceNotFoundError` when there is no such workspace. */
  abstract delete(id: UUID): Promise<void>;
}
