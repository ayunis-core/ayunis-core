import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { AssertKnowledgeBaseReadAccessQuery } from './assert-knowledge-base-read-access.query';

/**
 * The knowledge base, if the current user may read its documents, for
 * modules that show state of their own about it (synced locations).
 */
@Injectable()
export class AssertKnowledgeBaseReadAccessUseCase {
  private readonly logger = new Logger(
    AssertKnowledgeBaseReadAccessUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: AssertKnowledgeBaseReadAccessQuery,
  ): Promise<KnowledgeBase> {
    this.logger.log({ knowledgeBaseId: query.knowledgeBaseId }, 'execute');
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (!knowledgeBase)
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    await this.readAccess.requireRead(knowledgeBase);
    return knowledgeBase;
  }
}
