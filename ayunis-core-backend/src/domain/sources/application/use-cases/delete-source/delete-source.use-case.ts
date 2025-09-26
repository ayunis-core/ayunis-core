import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
  ) {}

  @Transactional()
  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.source.id}`);
    try {
      // Delete indexed content first
      const deleteContentCommand = new DeleteContentCommand({
        documentId: command.source.id,
      });

      await this.deleteContentUseCase.execute(deleteContentCommand);
      await this.sourceRepository.delete(command.source);

      this.logger.debug(
        `Successfully deleted source and indexed content: ${command.source.id}`,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error deleting source', {
        error: error as Error,
      });
    }
  }
}
