import type { UUID } from 'crypto';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';

/** What adding a transcript's summary chunks did. */
export type SummaryChunksOutcome = 'added' | 'already_added' | 'source_gone';

export abstract class SourceTranscriptRepository {
  /** Replaces the source's segments; joins the ambient transaction. */
  abstract replace(
    sourceId: UUID,
    segments: TranscriptSegment[],
  ): Promise<void>;
  /** The segments in transcript order. */
  abstract findBySourceId(sourceId: UUID): Promise<TranscriptSegment[]>;
  /**
   * Adds the summary chunks to a READY transcript source that has none yet,
   * locking the source until the ambient transaction ends.
   */
  abstract addSummaryChunks(
    sourceId: UUID,
    chunks: TextSourceContentChunk[],
  ): Promise<SummaryChunksOutcome>;
}
