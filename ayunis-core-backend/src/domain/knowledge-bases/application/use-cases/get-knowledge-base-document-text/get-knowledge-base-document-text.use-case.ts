import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { GetKnowledgeBaseDocumentTextQuery } from './get-knowledge-base-document-text.query';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import type { Source } from 'src/domain/sources/domain/source.entity';

@Injectable()
export class GetKnowledgeBaseDocumentTextUseCase {
  private readonly logger = new Logger(
    GetKnowledgeBaseDocumentTextUseCase.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: GetKnowledgeBaseDocumentTextQuery): Promise<Source> {
    this.logger.debug('Getting document text from knowledge base', {
      knowledgeBaseId: query.knowledgeBaseId,
      documentId: query.documentId,
    });

    const knowledgeBase = await this.knowledgeBaseRepository.findById(
      query.knowledgeBaseId,
    );
    if (knowledgeBase?.userId !== query.userId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

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
