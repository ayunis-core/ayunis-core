import type { UUID } from 'crypto';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

export interface CollectiveKnowledgeBaseScope {
  userId: UUID;
  orgId: UUID;
  teamIds: UUID[];
}

export interface CollectiveKnowledgeBaseTarget {
  knowledgeBaseId?: UUID;
  sourceId?: UUID;
}

export abstract class CollectiveKnowledgeBaseRepository {
  abstract findUsable(
    scope: CollectiveKnowledgeBaseScope,
    ids?: UUID[],
  ): Promise<CollectiveKnowledgeBase[]>;
  abstract findActiveUsable(
    scope: CollectiveKnowledgeBaseScope,
    target?: CollectiveKnowledgeBaseTarget,
  ): Promise<CollectiveKnowledgeBase[]>;
  abstract getActiveStates(
    knowledgeBaseIds: UUID[],
    userId: UUID,
  ): Promise<Map<UUID, boolean>>;
  abstract setActive(
    knowledgeBaseId: UUID,
    userId: UUID,
    isActive: boolean,
  ): Promise<void>;
}
