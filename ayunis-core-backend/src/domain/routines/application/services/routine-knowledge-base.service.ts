import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { FindAccessibleKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';
import { FindAccessibleKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-bases-by-ids/find-accessible-knowledge-bases-by-ids.use-case';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

/**
 * A routine uses personal knowledge bases the current user can access: their
 * own and ones shared with them. One whose access was lost counts as removed
 * until access is granted again, so nothing has to clean up its link.
 */
@Injectable()
export class RoutineKnowledgeBaseService {
  constructor(
    private readonly findAccessibleKnowledgeBaseUseCase: FindAccessibleKnowledgeBaseUseCase,
    private readonly findAccessibleKnowledgeBasesByIdsUseCase: FindAccessibleKnowledgeBasesByIdsUseCase,
  ) {}

  /** Throws `KnowledgeBaseNotFoundError` unless the user can access it. */
  async assertAddable(knowledgeBaseId: UUID): Promise<void> {
    const knowledgeBase = await this.findAccessibleKnowledgeBaseUseCase.execute(
      { knowledgeBaseId },
    );
    if (!(knowledgeBase instanceof PersonalKnowledgeBase)) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
  }

  /** The linked knowledge bases the user can still access, in link order. */
  async accessible(knowledgeBaseIds: UUID[]): Promise<PersonalKnowledgeBase[]> {
    if (knowledgeBaseIds.length === 0) return [];
    const knowledgeBases =
      await this.findAccessibleKnowledgeBasesByIdsUseCase.execute({
        knowledgeBaseIds,
      });
    return knowledgeBases.filter(
      (knowledgeBase) => knowledgeBase instanceof PersonalKnowledgeBase,
    );
  }
}
