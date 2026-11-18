import { Injectable, Logger } from '@nestjs/common';
import { classifySourceProcessingError } from './classify-source-processing-error';
import type { UUID } from 'crypto';
import { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { IngestBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import { SourceReindexScheduler } from './source-reindex-scheduler.service';

/**
 * Indexing and failure-cleanup helpers shared by the source processing
 * pipelines (document and URL crawl). Re-indexing deletes any prior entries
 * first so re-processing a source is idempotent, and records the embedding
 * model the entries come from.
 */
@Injectable()
export class SourceProcessingHelper {
  private readonly logger = new Logger(SourceProcessingHelper.name);

  constructor(
    private readonly ingestBulkContentUseCase: IngestBulkContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly reindexRepository: SourceReindexRepository,
    private readonly reindexScheduler: SourceReindexScheduler,
  ) {}

  /**
   * An org whose embedding model was removed while the source was processed
   * cannot embed it; the source keeps its text without index entries and is
   * indexed once a model is permitted again.
   */
  async index(
    sourceId: UUID,
    orgId: UUID,
    chunks: TextSourceContentChunk[],
    precomputedEmbeddings?: PreparedContentEmbeddings,
  ): Promise<void> {
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({ documentId: sourceId }),
    );
    const embeddingModelId = await this.ingest(
      sourceId,
      orgId,
      chunks,
      precomputedEmbeddings,
    );
    await this.reindexRepository.recordEmbeddingModel(
      sourceId,
      embeddingModelId,
    );
  }

  private async ingest(
    sourceId: UUID,
    orgId: UUID,
    chunks: TextSourceContentChunk[],
    precomputedEmbeddings?: PreparedContentEmbeddings,
  ): Promise<UUID | null> {
    try {
      return await this.ingestBulkContentUseCase.execute(
        new IngestBulkContentCommand({
          orgId,
          entries: chunks.map((chunk) => ({
            documentId: sourceId,
            chunkId: chunk.id,
            content: chunk.content,
          })),
          type: IndexType.PARENT_CHILD,
          precomputedEmbeddings,
        }),
      );
    } catch (error) {
      if (!(error instanceof PermittedEmbeddingModelNotFoundForOrgError))
        throw error;
      this.logger.warn(
        { sourceId, orgId },
        'No embedding model permitted, leaving the source unindexed',
      );
      return null;
    }
  }

  /** Call after the source turned READY; never throws. */
  reindexIfModelChanged(sourceId: UUID, orgId: UUID): Promise<void> {
    return this.reindexScheduler.reindexIfModelChanged(sourceId, orgId);
  }

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
