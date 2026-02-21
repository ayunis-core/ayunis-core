import type { UUID } from 'crypto';
import type { KnowledgeBase } from '../../domain/knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';

export abstract class KnowledgeBaseRepository {
  abstract findById(id: UUID): Promise<KnowledgeBase | null>;
  abstract findAllByUserId(userId: UUID): Promise<KnowledgeBase[]>;
  abstract save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>;
  abstract delete(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract assignSourceToKnowledgeBase(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void>;
  abstract findSourcesByKnowledgeBaseId(
    knowledgeBaseId: UUID,
  ): Promise<Source[]>;
  abstract findSourceByIdAndKnowledgeBaseId(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<Source | null>;
}
