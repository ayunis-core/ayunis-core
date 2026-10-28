import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';

@Injectable()
export class RemoveDocumentFromKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    RemoveDocumentFromKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly deleteSource: DeleteSourceUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(
    command: RemoveDocumentFromKnowledgeBaseCommand,
  ): Promise<void> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        documentId: command.documentId,
      },
      'Removing document from knowledge base',
    );
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(knowledgeBase);

    const source = await this.repository.findSourceByIdAndKnowledgeBaseId(
      command.documentId,
      knowledgeBase.id,
    );
    if (!source) {
      throw new DocumentNotInKnowledgeBaseError(
        command.documentId,
        knowledgeBase.id,
      );
    }
    await this.deleteSource.execute(
      new DeleteSourceCommand(command.documentId, knowledgeBase.orgId),
    );
  }
}
