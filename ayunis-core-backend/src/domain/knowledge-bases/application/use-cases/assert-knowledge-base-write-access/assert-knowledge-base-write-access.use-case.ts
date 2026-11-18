import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { AssertKnowledgeBaseWriteAccessQuery } from './assert-knowledge-base-write-access.query';

/**
 * The knowledge base, if the current user may change its documents, for
 * modules that add documents of their own (synced locations).
 */
@Injectable()
export class AssertKnowledgeBaseWriteAccessUseCase {
  private readonly logger = new Logger(
    AssertKnowledgeBaseWriteAccessUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: AssertKnowledgeBaseWriteAccessQuery,
  ): Promise<KnowledgeBase> {
    this.logger.log({ knowledgeBaseId: query.knowledgeBaseId }, 'execute');
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (!knowledgeBase)
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    await this.writeAccess.requireWrite(knowledgeBase);
    return knowledgeBase;
  }
}
