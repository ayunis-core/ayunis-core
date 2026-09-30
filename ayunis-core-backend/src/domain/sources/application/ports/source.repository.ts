import type { UUID } from 'crypto';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import type { SourceCitationTarget } from 'src/domain/sources/application/models/source-citation-target';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import type { SourceReindexSchedule } from 'src/domain/sources/application/models/source-reindex-schedule';
import type { DueSourceReindex } from 'src/domain/sources/application/models/due-source-reindex';

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<TextSource | DataSource | null>;
  abstract findByIds(ids: UUID[]): Promise<Source[]>;
  abstract findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]>;
  /**
   * Updates an existing source row and replaces its text details and every
   * content chunk. Must run inside a transaction. Returns null and writes
   * nothing when the source row no longer exists, so a source deleted
   * mid-processing is never re-created.
   */
  abstract replaceTextSource(
    source: TextSource,
    content: { text: string; chunks: TextSourceContentChunk[] },
  ): Promise<TextSource | null>;
  abstract findStaleProcessingSourceIds(
    staleBefore: Date,
    limit: number,
  ): Promise<UUID[]>;
  abstract save(source: Source): Promise<Source>;
  /** Atomically update status only if the current status matches `fromStatus`. Returns true if the row was updated. */
  abstract updateStatusConditionally(
    sourceId: UUID,
    fromStatus: SourceStatus,
    toStatus: SourceStatus,
    updates?: Partial<{ processingError: string | null; lastIndexedAt: Date }>,
  ): Promise<boolean>;
  /**
   * Refreshes processingStartedAt so the stale-processing cron leaves a
   * long-running job alone. UPDATE-only and guarded on PROCESSING — unlike
   * save(), it can never re-insert a concurrently deleted row. Returns false
   * when the source is gone or no longer processing.
   */
  abstract refreshProcessingHeartbeat(sourceId: UUID): Promise<boolean>;
  /**
   * Records a failed re-index of a READY source, leaving its status and
   * content untouched. UPDATE-only and guarded on READY; returns false when
   * the source is gone or no longer ready.
   */
  abstract recordRunFailure(
    sourceId: UUID,
    failure: {
      failedAt: Date;
      error: string;
      errorCode: SourceProcessingErrorCode;
    },
  ): Promise<boolean>;
  /**
   * Writes a source's re-index schedule and nothing else. UPDATE-only;
   * returns false when the source is gone.
   */
  abstract updateReindexSchedule(
    sourceId: UUID,
    schedule: SourceReindexSchedule,
  ): Promise<boolean>;
  /**
   * Claims up to `limit` due sources of a knowledge base and moves each one's
   * next due date one interval past now, in one statement that skips rows
   * another claimer holds — so concurrent schedulers never claim a source
   * twice. Sources outside a knowledge base are never claimed: their org,
   * which the run needs, is unknown.
   */
  abstract claimDueReindexes(limit: number): Promise<DueSourceReindex[]>;
  /**
   * Makes a claimed source due again at its previous due date so the next
   * sweep retries it. Does nothing when its schedule changed since the claim.
   */
  abstract releaseReindexClaim(claim: DueSourceReindex): Promise<void>;
  /** Distinct pages (chunk `meta.url`) in the source's committed content. */
  abstract countIndexedPages(sourceId: UUID): Promise<number>;
  /**
   * Writes a CSV source's parsed data. UPDATE-only — returns false instead of
   * resurrecting the row when the source was deleted mid-processing.
   */
  abstract updateCsvSourceData(
    sourceId: UUID,
    data: { headers: string[]; rows: string[][] },
  ): Promise<boolean>;
  abstract extractTextLines(
    sourceId: UUID,
    startLine: number,
    endLine: number,
  ): Promise<{ totalLines: number; text: string } | null>;
  abstract findCitationTarget(
    chunkId: UUID,
  ): Promise<SourceCitationTarget | null>;
  abstract findContentChunksByIds(chunkIds: UUID[]): Promise<
    {
      chunk: TextSourceContentChunk;
      sourceId: UUID;
      sourceName: string;
      sourceCreatedBy: SourceCreator;
    }[]
  >;
  abstract delete(sourceId: UUID): Promise<void>;
  abstract deleteMany(sourceIds: UUID[]): Promise<void>;
  /**
   * Returns the subset of `candidateIds` that are (a) older than `olderThan`,
   * (b) not attached to a knowledge base, and (c) not referenced by any
   * skill or agent assignment. Used by cross-module cleanup flows that
   * need to confirm a source is truly orphaned before deleting it.
   */
  abstract findUnreferencedIds(
    candidateIds: UUID[],
    olderThan: Date,
  ): Promise<UUID[]>;
}
