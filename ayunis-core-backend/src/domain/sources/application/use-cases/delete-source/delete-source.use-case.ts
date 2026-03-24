import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { ProcessingFilesCleanupService } from '../../services/processing-files-cleanup.service';
import { SourceStatus } from '../../../domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly processingFilesCleanupService: ProcessingFilesCleanupService,
  ) {}

  @Transactional()
  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.sourceId}`);
    try {
      const source = await this.sourceRepository.findById(command.sourceId);

      if (source?.status === SourceStatus.PROCESSING) {
        await this.cancelJobAndCleanupMinio(command.sourceId);
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

  private async cancelJobAndCleanupMinio(
    sourceId: DeleteSourceCommand['sourceId'],
  ): Promise<void> {
    try {
      await this.documentProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn('Failed to cancel processing job', {
        sourceId,
        error: err as Error,
      });
    }
    await this.processingFilesCleanupService.cleanup(sourceId);
  }
}
