import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

/**
 * Loads knowledge bases of the caller's organization without per-user access
 * checks, for trusted callers that only compare ownership (e.g. when a skill
 * changes owner). Never return the result to the user.
 */
@Injectable()
export class FindKnowledgeBasesByIdsUseCase {
  private readonly logger = new Logger(FindKnowledgeBasesByIdsUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: { knowledgeBaseIds: UUID[] }): Promise<KnowledgeBase[]> {
    this.logger.debug(
      { count: query.knowledgeBaseIds.length },
      'Finding knowledge bases by IDs',
    );
    if (query.knowledgeBaseIds.length === 0) return [];
    const { orgId } = getRequiredUserContext(this.context);
    return this.repository.findByIds(query.knowledgeBaseIds, { orgId });
  }
}
