import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
  DocumentNotInKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';

@Injectable()
export class RemoveDocumentFromKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    RemoveDocumentFromKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: RemoveDocumentFromKnowledgeBaseCommand,
  ): Promise<void> {
    this.logger.log('Removing document from knowledge base', {
      knowledgeBaseId: command.knowledgeBaseId,
      documentId: command.documentId,
    });

    const knowledgeBase = await this.knowledgeBaseRepository.findById(
      command.knowledgeBaseId,
    );
    if (knowledgeBase?.userId !== command.userId) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    const source =
      await this.knowledgeBaseRepository.findSourceByIdAndKnowledgeBaseId(
        command.documentId,
        command.knowledgeBaseId,
      );
    if (!source) {
      throw new DocumentNotInKnowledgeBaseError(
        command.documentId,
        command.knowledgeBaseId,
      );
    }

    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(command.documentId),
    );
  }
}
