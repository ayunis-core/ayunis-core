import { Injectable, Logger } from '@nestjs/common';
import { classifySourceProcessingError } from './classify-source-processing-error';
import type { UUID } from 'crypto';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';

/**
 * Failure-cleanup helpers shared by the source processing pipelines
 * (document and URL crawl).
 */
@Injectable()
export class SourceProcessingHelper {
  private readonly logger = new Logger(SourceProcessingHelper.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {}

  async cleanupIndex(sourceId: UUID): Promise<void> {
    try {
      await this.deleteContentUseCase.execute(
        new DeleteContentCommand({ documentId: sourceId }),
      );
    } catch (err) {
      this.logger.warn(
        {
          sourceId,
          err: err as Error,
        },
        'Failed to clean up partial vector index entries',
      );
    }
  }

  async markFailed(sourceId: UUID, error: unknown): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({
          sourceId,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown processing error',
          errorCode: classifySourceProcessingError(error),
        }),
      );
    } catch (err) {
      this.logger.error(
        {
          sourceId,
          err: err as Error,
        },
        'Failed to mark source as failed',
      );
    }
  }
}
