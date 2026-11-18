import type { UUID } from 'crypto';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

export interface SourceReindexTarget {
  sourceId: UUID;
  orgId: UUID;
}

/**
 * Bookkeeping of which embedding model a text source's index entries come
 * from, and the REINDEXING transitions that follow a change of the org's
 * model. Every write is a guarded UPDATE that cannot recreate a deleted row.
 */
export abstract class SourceReindexRepository {
  /** Records the catalog model the source was just indexed with (null: none). */
  abstract recordEmbeddingModel(
    sourceId: UUID,
    embeddingModelId: UUID | null,
  ): Promise<void>;
  /**
   * Moves the org's text sources that need the given model's vectors to
   * REINDEXING and returns their ids: READY ones indexed with another or an
   * unknown model, FAILED ones whose text is stored, and those already
   * REINDEXING (so lost jobs are queued again).
   */
  abstract flagOrgSourcesForReindex(
    orgId: UUID,
    embeddingModelId: UUID,
  ): Promise<UUID[]>;
  /** READY → REINDEXING when the source was indexed with another model. */
  abstract flagIfIndexedWithOtherModel(
    sourceId: UUID,
    embeddingModelId: UUID,
  ): Promise<boolean>;
  /**
   * REINDEXING sources not handed to the queue for `olderThanMs`, oldest
   * first, with their org. Each one returned is stamped, so the next call
   * moves on to others. Measured on the database clock, which also stamps.
   */
  abstract claimStaleReindexing(
    olderThanMs: number,
    limit: number,
  ): Promise<SourceReindexTarget[]>;
  /**
   * Locks a REINDEXING source until the ambient transaction ends; false when
   * it is gone or in another status.
   */
  abstract lockReindexing(sourceId: UUID): Promise<boolean>;
  abstract isReindexing(sourceId: UUID): Promise<boolean>;
  /** Leaves a REINDEXING source to the next stale-reindexing sweep. */
  abstract deferReindex(sourceId: UUID): Promise<boolean>;
  abstract findContentChunks(sourceId: UUID): Promise<TextSourceContentChunk[]>;
  /** REINDEXING → READY, recording the model of the new index entries. */
  abstract completeReindex(
    sourceId: UUID,
    embeddingModelId: UUID,
  ): Promise<boolean>;
  /** REINDEXING → READY, keeping the index entries and model it had. */
  abstract releaseReindexing(sourceId: UUID): Promise<boolean>;
  /** REINDEXING → FAILED; the source keeps its text but no model. */
  abstract failReindex(
    sourceId: UUID,
    error: { message: string; code: SourceProcessingErrorCode },
  ): Promise<boolean>;
}
