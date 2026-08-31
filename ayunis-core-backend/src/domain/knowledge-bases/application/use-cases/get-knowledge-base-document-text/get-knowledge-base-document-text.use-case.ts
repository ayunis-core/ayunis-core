import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { GetKnowledgeBaseDocumentTextQuery } from './get-knowledge-base-document-text.query';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';

@Injectable()
export class GetKnowledgeBaseDocumentTextUseCase {
  constructor(
    @InjectPinoLogger(GetKnowledgeBaseDocumentTextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
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

    const knowledgeBase =
      await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
        query.knowledgeBaseId,
      );

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
