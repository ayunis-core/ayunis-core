import type { UUID } from 'crypto';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

export abstract class AccessibleKnowledgeBasesByIdsRepository {
  abstract findAccessibleByIds(
    ids: UUID[],
    userId: UUID,
    orgId: UUID,
  ): Promise<PersonalKnowledgeBase[]>;
}
