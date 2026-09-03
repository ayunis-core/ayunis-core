import { Injectable, Logger } from '@nestjs/common';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';

@Injectable()
export class ListKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(ListKnowledgeBaseDocumentsUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: ListKnowledgeBaseDocumentsQuery): Promise<Source[]> {
    this.logger.log(
      {
        knowledgeBaseId: query.knowledgeBaseId,
      },
      'Listing knowledge base documents',
    );

    try {
      const knowledgeBase = await this.knowledgeBaseRepository.findById(
        query.knowledgeBaseId,
      );
      if (!knowledgeBase) {
        throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
      }

      return await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
        query.knowledgeBaseId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error listing knowledge base documents',
      );
      throw new UnexpectedKnowledgeBaseError(
        'Error listing knowledge base documents',
        { err: error as Error },
      );
    }
  }
}
