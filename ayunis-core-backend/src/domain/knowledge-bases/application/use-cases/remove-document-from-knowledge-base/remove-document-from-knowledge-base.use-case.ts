import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
  DocumentNotInKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';

@Injectable()
export class RemoveDocumentFromKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(RemoveDocumentFromKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

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

    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error removing document from knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError(
        'Error removing document from knowledge base',
        { err: error as Error },
      );
    }
  }
}
