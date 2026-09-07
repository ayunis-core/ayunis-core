import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { GetKnowledgeBaseDocumentTextQuery } from './get-knowledge-base-document-text.query';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { FindKnowledgeBaseForThreadUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base-for-thread/find-knowledge-base-for-thread.use-case';

@Injectable()
export class GetKnowledgeBaseDocumentTextUseCase {
  private readonly logger = new Logger(
    GetKnowledgeBaseDocumentTextUseCase.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly findKnowledgeBaseForThread: FindKnowledgeBaseForThreadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: GetKnowledgeBaseDocumentTextQuery): Promise<Source> {
    this.logger.debug(
      {
        knowledgeBaseId: query.knowledgeBaseId,
        documentId: query.documentId,
      },
      'Getting document text from knowledge base',
    );

    const knowledgeBase = await this.findKnowledgeBaseForThread.execute({
      knowledgeBaseId: query.knowledgeBaseId,
      threadId: query.threadId,
    });

    if (knowledgeBase.orgId !== query.orgId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

    const source =
      await this.knowledgeBaseRepository.findSourceByIdAndKnowledgeBaseId(
        query.documentId,
        query.knowledgeBaseId,
      );

    if (!source) {
      throw new DocumentNotInKnowledgeBaseError(
        query.documentId,
        query.knowledgeBaseId,
      );
    }

    return source;
  }
}
