import { Injectable, Logger } from '@nestjs/common';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';

@Injectable()
export class ListKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(ListKnowledgeBaseDocumentsUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  /**
   * Lists documents for a knowledge base.
   * Note: Access control and existence validation must be performed by the caller
   * (e.g., via KnowledgeBaseAccessService.findAccessibleKnowledgeBase) before invoking this use case.
   */
  async execute(query: ListKnowledgeBaseDocumentsQuery): Promise<Source[]> {
    this.logger.log('Listing knowledge base documents', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    try {
      return await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
        query.knowledgeBaseId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error listing knowledge base documents', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError(
        'Error listing knowledge base documents',
        { error: error as Error },
      );
    }
  }
}
