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
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { getRequiredUserContext } from 'src/common/context/required-context';

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
    const { orgId } = getRequiredUserContext(this.context);
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
