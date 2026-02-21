import type { UUID } from 'crypto';
import type { KnowledgeBase } from '../../domain/knowledge-base.entity';

export abstract class KnowledgeBaseRepository {
  abstract findById(id: UUID): Promise<KnowledgeBase | null>;
  abstract findAllByUserId(userId: UUID): Promise<KnowledgeBase[]>;
  abstract save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>;
  abstract delete(knowledgeBase: KnowledgeBase): Promise<void>;
}
