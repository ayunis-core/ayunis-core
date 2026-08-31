import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';

@Injectable()
export class RemoveDocumentFromKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(RemoveDocumentFromKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(
    command: RemoveDocumentFromKnowledgeBaseCommand,
  ): Promise<void> {
    this.logger.info(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        documentId: command.documentId,
      },
      'Removing document from knowledge base',
    );

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
      new DeleteSourceCommand(command.documentId, knowledgeBase.orgId),
    );
  }
}
