import type { UUID } from 'crypto';

export interface WorkspaceKnowledgeBaseLink {
  workspaceId: UUID;
  knowledgeBaseId: UUID;
  linkedByUserId: UUID | null;
  linkedAt: Date;
}

export abstract class WorkspaceKnowledgeBaseLinkRepository {
  abstract findByWorkspace(
    workspaceId: UUID,
  ): Promise<WorkspaceKnowledgeBaseLink[]>;
  abstract findByKnowledgeBase(
    knowledgeBaseId: UUID,
  ): Promise<WorkspaceKnowledgeBaseLink[]>;
  abstract isLinked(workspaceId: UUID, knowledgeBaseId: UUID): Promise<boolean>;
  abstract link(
    workspaceId: UUID,
    knowledgeBaseIds: UUID[],
    linkedByUserId: UUID,
  ): Promise<void>;
  abstract unlink(workspaceId: UUID, knowledgeBaseId: UUID): Promise<void>;
}
