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

export interface WorkspacePrincipal {
  userId: UUID;
  orgId: UUID;
}

export abstract class WorkspacesRepository {
  abstract findAllAccessible(
    principal: WorkspacePrincipal,
    query: WorkspaceListOptions,
  ): Promise<Paginated<Workspace>>;
  abstract findAllAccessibleByIds(
    principal: WorkspacePrincipal,
    ids: UUID[],
  ): Promise<Workspace[]>;
  abstract findAccessibleIds(principal: WorkspacePrincipal): Promise<UUID[]>;
  abstract findOne(id: UUID): Promise<Workspace | null>;
  abstract findManyByIds(ids: UUID[]): Promise<Workspace[]>;

  /**
   * Skill and knowledge-base counts plus the viewer's own chat count and
   * latest chat activity per workspace, for the list page. Missing entries
   * mean "nothing yet".
   */
  abstract getListStats(
    workspaceIds: UUID[],
    userId: UUID,
  ): Promise<Map<UUID, WorkspaceListStats>>;
  abstract findAllOwnedBy(userId: UUID): Promise<Workspace[]>;
  abstract lockForUpdate(id: UUID): Promise<void>;
  abstract changeOwner(id: UUID, userId: UUID): Promise<void>;
  abstract save(workspace: Workspace): Promise<Workspace>;
  abstract getContextRefs(workspaceId: UUID): Promise<WorkspaceContextRefs>;
  /** Throws `WorkspaceNotFoundError` when the user owns no such workspace. */
  abstract delete(userId: UUID, id: UUID): Promise<void>;
}
