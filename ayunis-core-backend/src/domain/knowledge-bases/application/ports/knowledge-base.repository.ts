import type { UUID } from 'crypto';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface KnowledgeBaseListOptions {
  search?: string;
  limit: number;
  offset: number;
}

export abstract class KnowledgeBaseRepository {
  abstract findById(id: UUID): Promise<KnowledgeBase | null>;
  abstract findByIds(ids: UUID[]): Promise<KnowledgeBase[]>;
  abstract findAllByUserId(userId: UUID): Promise<KnowledgeBase[]>;
  abstract activate(knowledgeBaseId: UUID, userId: UUID): Promise<void>;
  abstract deactivate(knowledgeBaseId: UUID, userId: UUID): Promise<void>;
  abstract isActive(knowledgeBaseId: UUID, userId: UUID): Promise<boolean>;
  abstract getActiveIds(userId: UUID): Promise<Set<UUID>>;
  abstract findActiveAccessible(
    userId: UUID,
    orgId: UUID,
  ): Promise<KnowledgeBase[]>;
  abstract findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBase>>;
  abstract save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>;
  abstract delete(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract assignSourceToKnowledgeBase(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void>;
  abstract duplicateDocumentsIntoKnowledgeBase(
    sourceKnowledgeBaseId: UUID,
    targetKnowledgeBaseId: UUID,
  ): Promise<void>;
  abstract findSourcesByKnowledgeBaseId(
    knowledgeBaseId: UUID,
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
