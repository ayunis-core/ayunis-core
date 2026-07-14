import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { SourceProcessingCleanupService } from '../../services/source-processing-cleanup.service';
import { SourceStatus } from '../../../domain/source-status.enum';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly sourceProcessingCleanupService: SourceProcessingCleanupService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.sourceId}`);
    const source = await this.sourceRepository.findById(command.sourceId);

    if (source?.status === SourceStatus.PROCESSING) {
      await this.sourceProcessingCleanupService.cancelAndCleanup(
        command.sourceId,
      );
    }

    // Delete indexed content first
    const deleteContentCommand = new DeleteContentCommand({
      documentId: command.sourceId,
    });

    await this.deleteContentUseCase.execute(deleteContentCommand);
    await this.sourceRepository.delete(command.sourceId);

    this.logger.debug(
      `Successfully deleted source and indexed content: ${command.sourceId}`,
    );
  }
}
