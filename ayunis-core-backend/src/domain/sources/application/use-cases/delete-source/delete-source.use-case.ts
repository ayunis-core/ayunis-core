import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly deleteContentUseCase: DeleteContentUseCase,
  ) {}

  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.source.id}`);
    try {
      // Delete indexed content first
      const deleteContentCommand = new DeleteContentCommand({
        documentId: command.source.id,
      });

      await this.deleteContentUseCase.execute(deleteContentCommand);

      // Then delete the source from the database
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
