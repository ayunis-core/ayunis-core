import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

@Injectable()
export class FindAccessibleKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindAccessibleKnowledgeBaseUseCase.name);

  constructor(
    private readonly access: KnowledgeBaseAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseId: UUID;
  }): Promise<PersonalKnowledgeBase> {
    this.logger.debug(query, 'Finding accessible personal knowledge base');
    const orgId = this.context.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    const knowledgeBase = await this.access.findAccessibleKnowledgeBase(
      query.knowledgeBaseId,
    );
    if (knowledgeBase.orgId !== orgId)
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    return knowledgeBase;
  }
}
