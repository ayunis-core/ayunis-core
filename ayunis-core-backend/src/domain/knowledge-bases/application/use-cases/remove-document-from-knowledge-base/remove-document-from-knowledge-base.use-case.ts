import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(
    RemoveDocumentFromKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  async execute(
    command: RemoveDocumentFromKnowledgeBaseCommand,
  ): Promise<void> {
    this.logger.log('Removing document from knowledge base', {
      knowledgeBaseId: command.knowledgeBaseId,
      documentId: command.documentId,
    });

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

      await this.deleteSourceUseCase.execute(new DeleteSourceCommand(source));
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error removing document from knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError(
        'Error removing document from knowledge base',
        { error: error as Error },
      );
    }
  }
}
