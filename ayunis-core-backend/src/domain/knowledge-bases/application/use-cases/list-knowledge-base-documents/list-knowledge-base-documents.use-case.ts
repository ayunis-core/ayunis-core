import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';

@Injectable()
export class ListKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(ListKnowledgeBaseDocumentsUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: ListKnowledgeBaseDocumentsQuery): Promise<Source[]> {
    this.logger.log(
      { knowledgeBaseId: query.knowledgeBaseId },
      'Listing knowledge base documents',
    );
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    await this.readAccess.requireRead(knowledgeBase);
    return this.repository.findSourcesByKnowledgeBaseId(knowledgeBase.id);
  }
}
