import type { UUID } from 'crypto';

export interface WorkspaceKnowledgeBaseLink {
  workspaceId: UUID;
  knowledgeBaseId: UUID;
  linkedByUserId: UUID | null;
  linkedAt: Date;
}

export interface PersonalKnowledgeBaseLink {
  workspaceId: UUID;
  knowledgeBaseId: UUID;
  ownerId: UUID;
}

export interface PersonalKnowledgeBaseLinkFilter {
  workspaceIds?: UUID[];
  ownerIds?: UUID[];
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
  abstract findPersonalLinks(
    filter: PersonalKnowledgeBaseLinkFilter,
  ): Promise<PersonalKnowledgeBaseLink[]>;
  abstract removeMany(
    links: Pick<PersonalKnowledgeBaseLink, 'workspaceId' | 'knowledgeBaseId'>[],
  ): Promise<number>;
}
