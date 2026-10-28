import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindKnowledgeBaseForThreadUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseForThreadUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseId: UUID;
    threadId?: UUID;
  }): Promise<KnowledgeBase> {
    this.logger.log(query, 'Finding knowledge base for thread');
    const { orgId } = getRequiredUserContext(this.context);

    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (knowledgeBase?.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      await this.access.requireRead(knowledgeBase);
      return knowledgeBase;
    }
    if (!query.threadId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    await this.access.requireExecution(knowledgeBase, query.threadId);
    return knowledgeBase;
  }
}
