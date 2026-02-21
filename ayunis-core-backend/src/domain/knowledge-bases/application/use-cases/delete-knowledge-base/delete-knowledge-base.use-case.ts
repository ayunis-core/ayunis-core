import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteKnowledgeBaseUseCase {
  private readonly logger = new Logger(DeleteKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteKnowledgeBaseCommand): Promise<void> {
    this.logger.log('Deleting knowledge base', {
      knowledgeBaseId: command.knowledgeBaseId,
      userId: command.userId,
    });

    try {
      const existing = await this.knowledgeBaseRepository.findById(
        command.knowledgeBaseId,
      );
      if (existing?.userId !== command.userId) {
        throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
      }

      const sources = await this.sourceRepository.findByKnowledgeBaseId(
        command.knowledgeBaseId,
      );
      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sources),
      );

      await this.knowledgeBaseRepository.delete(existing);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error deleting knowledge base', {
        error: error as Error,
      });
    }
  }
}
