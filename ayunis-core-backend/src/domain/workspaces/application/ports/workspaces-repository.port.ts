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

export abstract class WorkspacesRepository {
  /** Ordered by the workspace's last update, newest first. */
  abstract findAllByUserId(
    userId: UUID,
    query: WorkspaceListOptions,
  ): Promise<Paginated<Workspace>>;
  abstract findAllByIds(userId: UUID, ids: UUID[]): Promise<Workspace[]>;

  /**
   * Chat, skill and knowledge-base counts plus the latest chat activity per
   * workspace, for the list page. Missing entries mean "nothing yet".
   */
  abstract getListStats(
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceListStats>>;
  abstract findById(userId: UUID, id: UUID): Promise<Workspace | null>;
  abstract save(workspace: Workspace): Promise<Workspace>;
  abstract getContextRefs(workspaceId: UUID): Promise<WorkspaceContextRefs>;
  /** Throws `WorkspaceNotFoundError` when the user owns no such workspace. */
  abstract delete(userId: UUID, id: UUID): Promise<void>;
}
