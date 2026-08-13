import type { UUID } from 'crypto';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export interface WorkspaceThreadStats {
  chatCount: number;
  lastActivityAt: Date | null;
}

export interface WorkspaceKnowledgeBaseRef {
  id: UUID;
  name: string;
  description: string | null;
  documentCount: number;
}

export interface WorkspaceContextRefs {
  skillIds: UUID[];
  knowledgeBases: WorkspaceKnowledgeBaseRef[];
  sourceIds: UUID[];
}

export abstract class WorkspacesRepository {
  /** Ordered by the workspace's last update, newest first. */
  abstract findAllByUserId(userId: UUID): Promise<Workspace[]>;
  abstract findAllByIds(userId: UUID, ids: UUID[]): Promise<Workspace[]>;

  /**
   * Chat count and latest chat activity per workspace, for the list page.
   * Missing entries mean "no chats".
   */
  abstract getThreadStats(
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceThreadStats>>;
  abstract findById(userId: UUID, id: UUID): Promise<Workspace | null>;
  abstract save(workspace: Workspace): Promise<Workspace>;
  abstract attachSkill(workspaceId: UUID, skillId: UUID): Promise<void>;
  abstract detachSkill(workspaceId: UUID, skillId: UUID): Promise<void>;
  abstract attachKnowledgeBase(
    workspaceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void>;
  abstract detachKnowledgeBase(
    workspaceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void>;
  abstract attachSource(workspaceId: UUID, sourceId: UUID): Promise<void>;
  abstract getContextRefs(workspaceId: UUID): Promise<WorkspaceContextRefs>;
  /** Throws `WorkspaceNotFoundError` when the user owns no such workspace. */
  abstract delete(userId: UUID, id: UUID): Promise<UUID[]>;
}
