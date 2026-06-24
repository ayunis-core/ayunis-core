import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { IngestBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { MarkSourceFailedUseCase } from '../use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from '../use-cases/mark-source-failed/mark-source-failed.command';
import type { TextSourceContentChunk } from '../../domain/source-content-chunk.entity';

/**
 * Indexing and failure-cleanup helpers shared by the source processing
 * pipelines (document and URL crawl). Re-indexing deletes any prior entries
 * first so re-processing a source is idempotent.
 */
@Injectable()
export class SourceProcessingHelper {
  private readonly logger = new Logger(SourceProcessingHelper.name);

  constructor(
    private readonly ingestBulkContentUseCase: IngestBulkContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {}

  async index(
    sourceId: UUID,
    orgId: UUID,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({ documentId: sourceId }),
    );
    await this.ingestBulkContentUseCase.execute(
      new IngestBulkContentCommand({
        orgId,
        entries: chunks.map((chunk) => ({
          documentId: sourceId,
          chunkId: chunk.id,
          content: chunk.content,
        })),
        type: IndexType.PARENT_CHILD,
      }),
    );
  }

  async cleanupIndex(sourceId: UUID): Promise<void> {
    try {
      await this.deleteContentUseCase.execute(
        new DeleteContentCommand({ documentId: sourceId }),
      );
    } catch (err) {
      this.logger.warn('Failed to clean up partial vector index entries', {
        sourceId,
        error: err as Error,
      });
    }
  }

  async markFailed(sourceId: UUID, errorMessage: string): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({ sourceId, errorMessage }),
      );
    } catch (err) {
      this.logger.error('Failed to mark source as failed', {
        sourceId,
        error: err as Error,
      });
    }
  }
}
