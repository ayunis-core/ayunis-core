import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

@Injectable()
export class FindAccessibleKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindAccessibleKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseId: UUID;
  }): Promise<PersonalKnowledgeBase> {
    this.logger.debug(query, 'Finding accessible personal knowledge base');
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (
      !(knowledgeBase instanceof PersonalKnowledgeBase) ||
      knowledgeBase.orgId !== orgId
    ) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    await this.readAccess.requireRead(knowledgeBase);
    return knowledgeBase;
  }
}
