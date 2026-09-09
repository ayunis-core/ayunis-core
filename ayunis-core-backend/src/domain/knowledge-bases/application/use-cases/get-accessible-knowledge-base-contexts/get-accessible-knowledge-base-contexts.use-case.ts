import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseWithUserContext } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindAccessibleKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';

export type AccessibleKnowledgeBaseContext =
  KnowledgeBaseWithUserContext<PersonalKnowledgeBase>;

@Injectable()
export class GetAccessibleKnowledgeBaseContextsUseCase {
  private readonly logger = new Logger(
    GetAccessibleKnowledgeBaseContextsUseCase.name,
  );

  constructor(
    private readonly findAccessible: FindAccessibleKnowledgeBaseUseCase,
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<AccessibleKnowledgeBaseContext[]> {
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const ids = [...new Set(query.knowledgeBaseIds)];
    this.logger.debug(
      { count: ids.length },
      'Resolving knowledge-base access and activation',
    );
    if (ids.length === 0) return [];
    const [knowledgeBases, activeIds] = await Promise.all([
      Promise.all(
        ids.map((knowledgeBaseId) =>
          this.findAccessible.execute({ knowledgeBaseId }),
        ),
      ),
      this.repository.getActiveIds(userId),
    ]);
    return knowledgeBases.map((knowledgeBase) => ({
      knowledgeBase,
      isShared: knowledgeBase.userId !== userId,
      isActive: activeIds.has(knowledgeBase.id),
    }));
  }
}
