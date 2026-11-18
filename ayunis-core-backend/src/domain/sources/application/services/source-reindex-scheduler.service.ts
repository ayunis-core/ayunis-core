import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { SourceReindexProcessingPort } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';

/**
 * Hands a source that just turned READY to re-indexing when the org's
 * embedding model changed while it was indexed. The model change flags only
 * READY sources, so one still processing at that moment is caught here;
 * checking after the READY write leaves no gap between the two.
 */
@Injectable()
export class SourceReindexScheduler {
  private readonly logger = new Logger(SourceReindexScheduler.name);

  constructor(
    private readonly reindexRepository: SourceReindexRepository,
    private readonly reindexQueue: SourceReindexProcessingPort,
    private readonly getPermittedEmbeddingModel: GetPermittedEmbeddingModelUseCase,
  ) {}

  /** Never throws: the source is READY whatever happens here. */
  async reindexIfModelChanged(sourceId: UUID, orgId: UUID): Promise<void> {
    try {
      const current = await this.currentModelId(orgId);
      // Without a model nothing can be embedded; permitting one flags the
      // source then.
      if (!current) return;
      if (
        await this.reindexRepository.flagIfIndexedWithOtherModel(
          sourceId,
          current,
        )
      ) {
        this.logger.log(
          { sourceId, orgId },
          'Embedding model changed while indexing, re-indexing source',
        );
        await this.reindexQueue.enqueue(orgId, [sourceId]);
      }
    } catch (error) {
      this.logger.error(
        { sourceId, orgId, err: error as Error },
        'Could not check the embedding model of a ready source',
      );
    }
  }

  /** Catalog ID of the org's embedding model, or null without one. */
  async currentModelId(orgId: UUID): Promise<UUID | null> {
    try {
      const permitted = await this.getPermittedEmbeddingModel.execute(
        new GetPermittedEmbeddingModelQuery({ orgId }),
      );
      return permitted.model.id;
    } catch (error) {
      if (error instanceof PermittedEmbeddingModelNotFoundForOrgError)
        return null;
      throw error;
    }
  }
}
