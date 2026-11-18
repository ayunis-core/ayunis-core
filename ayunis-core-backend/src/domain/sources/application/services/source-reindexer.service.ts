import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { IngestBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { PrepareContentEmbeddingsCommand } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.command';
import { PrepareContentEmbeddingsUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.use-case';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import { SourceReindexScheduler } from './source-reindex-scheduler.service';

export type SourceReindexOutcome = 'reindexed' | 'skipped' | 'no_model';

/**
 * Embeds a REINDEXING source's stored chunks again with the org's current
 * model; text and chunk ids stay as they are, so citations keep working.
 *
 * The vectors are computed first, outside any transaction. The old entries
 * are then replaced in one transaction holding the source's row lock, which
 * also serializes with deletion and with a transcript summary added in the
 * meantime: its chunks are re-read under the lock and embedded with the rest.
 */
@Injectable()
export class SourceReindexer {
  private readonly logger = new Logger(SourceReindexer.name);

  constructor(
    private readonly reindexRepository: SourceReindexRepository,
    private readonly prepareContentEmbeddings: PrepareContentEmbeddingsUseCase,
    private readonly deleteContent: DeleteContentUseCase,
    private readonly ingestBulkContent: IngestBulkContentUseCase,
    private readonly scheduler: SourceReindexScheduler,
  ) {}

  async reindex(sourceId: UUID, orgId: UUID): Promise<SourceReindexOutcome> {
    try {
      const chunks = await this.reindexRepository.findContentChunks(sourceId);
      const prepared = await this.prepareContentEmbeddings.execute(
        new PrepareContentEmbeddingsCommand({
          orgId,
          contents: chunks.map((chunk) => chunk.content),
          type: IndexType.PARENT_CHILD,
          priority: EmbeddingPriority.REINDEXING,
        }),
      );
      if (!(await this.replaceIndex(sourceId, orgId, prepared)))
        return 'skipped';
    } catch (error) {
      if (!(error instanceof PermittedEmbeddingModelNotFoundForOrgError))
        throw error;
      // The model was removed again before this job ran. The source keeps
      // its previous entries and is flagged again once a model is permitted;
      // a model permitted since the check flags it right away.
      this.logger.warn({ sourceId, orgId }, 'No embedding model to re-index');
      await this.reindexRepository.releaseReindexing(sourceId);
      await this.scheduler.reindexIfModelChanged(sourceId, orgId);
      return 'no_model';
    }
    await this.scheduler.reindexIfModelChanged(sourceId, orgId);
    return 'reindexed';
  }

  @Transactional()
  private async replaceIndex(
    sourceId: UUID,
    orgId: UUID,
    prepared: PreparedContentEmbeddings | undefined,
  ): Promise<boolean> {
    if (!(await this.reindexRepository.lockReindexing(sourceId))) return false;
    const chunks = await this.reindexRepository.findContentChunks(sourceId);
    await this.deleteContent.execute(
      new DeleteContentCommand({ documentId: sourceId }),
    );
    const embeddingModelId = await this.ingestBulkContent.execute(
      new IngestBulkContentCommand({
        orgId,
        entries: chunks.map((chunk) => ({
          documentId: sourceId,
          chunkId: chunk.id,
          content: chunk.content,
        })),
        type: IndexType.PARENT_CHILD,
        precomputedEmbeddings: prepared,
        priority: EmbeddingPriority.REINDEXING,
      }),
    );
    return this.reindexRepository.completeReindex(sourceId, embeddingModelId);
  }
}
