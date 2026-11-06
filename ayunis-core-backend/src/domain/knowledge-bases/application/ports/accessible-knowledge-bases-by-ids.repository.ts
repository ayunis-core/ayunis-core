import type { UUID } from 'crypto';
import type { AccessibleKnowledgeBaseScope } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { NonWorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

export abstract class AccessibleKnowledgeBasesByIdsRepository {
  abstract findAccessibleByIds(
    ids: UUID[],
    scope: AccessibleKnowledgeBaseScope,
  ): Promise<NonWorkspaceKnowledgeBase[]>;
}
