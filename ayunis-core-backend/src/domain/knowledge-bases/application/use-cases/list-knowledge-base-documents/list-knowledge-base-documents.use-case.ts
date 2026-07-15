import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';

@Injectable()
export class ListKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(ListKnowledgeBaseDocumentsUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: ListKnowledgeBaseDocumentsQuery): Promise<Source[]> {
    this.logger.log('Listing knowledge base documents', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    const knowledgeBase = await this.knowledgeBaseRepository.findById(
      query.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

    return await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
      query.knowledgeBaseId,
    );
  }
}
