import type { UUID } from 'crypto';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';

export abstract class SourceTranscriptRepository {
  /** Replaces the source's segments; joins the ambient transaction. */
  abstract replace(
    sourceId: UUID,
    segments: TranscriptSegment[],
  ): Promise<void>;
  /** The segments in transcript order. */
  abstract findBySourceId(sourceId: UUID): Promise<TranscriptSegment[]>;
}
