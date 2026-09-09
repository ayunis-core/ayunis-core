import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';

/** Personal read access, or workspace access through an authorized thread. */
@Injectable()
export class FindKnowledgeBaseForThreadUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseForThreadUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly personalAccess: KnowledgeBaseAccessService,
    private readonly findThreads: FindThreadsByIdsUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseId: UUID;
    threadId?: UUID;
  }): Promise<KnowledgeBase> {
    this.logger.log(query, 'Finding knowledge base for thread');
    const { knowledgeBaseId, threadId } = query;
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const knowledgeBase = await this.repository.findById(knowledgeBaseId);
    if (knowledgeBase?.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      return this.personalAccess.findAccessibleKnowledgeBase(knowledgeBaseId);
    }
    if (threadId) {
      // Resolve the execution thread under the current principal, never a
      // workspace ID supplied by the model. This lookup does not load messages.
      const threads = await this.findThreads.execute(
        new FindThreadsByIdsQuery(userId, [threadId]),
      );
      if (threads.at(0)?.workspaceId === knowledgeBase.workspaceId) {
        return knowledgeBase;
      }
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
  }
}
