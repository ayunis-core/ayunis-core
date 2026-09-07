import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';
import { KnowledgeBaseAccessService } from './knowledge-base-access.service';

@Injectable()
export class KnowledgeBaseToolAccessService {
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly personalAccess: KnowledgeBaseAccessService,
    private readonly findThreadsByIds: FindThreadsByIdsUseCase,
    private readonly context: ContextService,
  ) {}

  async findAccessibleKnowledgeBase(
    id: UUID,
    threadId?: UUID,
  ): Promise<KnowledgeBase> {
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const knowledgeBase = await this.repository.findById(id);
    if (knowledgeBase?.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(id);
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      return this.personalAccess.findAccessibleKnowledgeBase(id);
    }
    if (threadId) {
      // Resolve the trusted execution thread under the current principal, never
      // a workspace ID supplied by the model. This lookup does not load messages.
      const threads = await this.findThreadsByIds.execute(
        new FindThreadsByIdsQuery(userId, [threadId]),
      );
      if (threads.at(0)?.workspaceId === knowledgeBase.workspaceId) {
        return knowledgeBase;
      }
    }
    throw new KnowledgeBaseNotFoundError(id);
  }
}
