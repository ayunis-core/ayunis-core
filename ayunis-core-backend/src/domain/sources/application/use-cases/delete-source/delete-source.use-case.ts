import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug({ sourceId: command.sourceId }, 'Deleting source');
    try {
      const source = await this.sourceRepository.findById(command.sourceId);

      if (source?.status === SourceStatus.PROCESSING) {
        await this.cleanupSourceProcessingUseCase.execute(
          new CleanupSourceProcessingCommand([command.sourceId], command.orgId),
        );
      }

      // Delete indexed content first
      const deleteContentCommand = new DeleteContentCommand({
        documentId: command.sourceId,
      });

      await this.deleteContentUseCase.execute(deleteContentCommand);
      await this.sourceRepository.delete(command.sourceId);

      this.logger.debug(
        { sourceId: command.sourceId },
        'Successfully deleted source and indexed content',
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting source',
      );
      throw new UnexpectedSourceError('Error deleting source', {
        error: error as Error,
      });
    }
  }
}
