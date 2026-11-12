import type { UUID } from 'crypto';
import type { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';

export interface GeneratedRecordingSummary {
  content: string;
  modelId: UUID;
  modelName: string;
  generatedAt: Date;
}

/**
 * Every write is conditional on the run and its state, so a run that was
 * superseded, finished or deleted with its recording writes nothing.
 */
export abstract class RecordingSummaryRepository {
  abstract findByRecordingId(
    recordingId: UUID,
  ): Promise<RecordingSummary | null>;
  /**
   * The summaries of the given recordings that have one, by recording id,
   * without their content.
   */
  abstract findByRecordingIds(
    recordingIds: UUID[],
  ): Promise<Map<UUID, RecordingSummary>>;
  /**
   * Queues the first run of the recording that just got its audio, within the
   * ambient transaction; the run waits for the transcript.
   */
  abstract createPending(
    recordingId: UUID,
    runId: UUID,
    triggeredByUserId: UUID,
  ): Promise<void>;
  /** The queued run of the recording whose audio is the given source. */
  abstract findPendingForAudio(
    audioSourceId: UUID,
  ): Promise<RecordingSummary | null>;
  /** Queues a new run of a failed summary; null when it has not failed. */
  abstract restartFailed(
    recordingId: UUID,
    runId: UUID,
    triggeredByUserId: UUID,
  ): Promise<RecordingSummary | null>;
  /**
   * Marks the run as running for its job. Null when it is no longer the
   * recording's current run or has already finished.
   */
  abstract claim(
    recordingId: UUID,
    runId: UUID,
  ): Promise<RecordingSummary | null>;
  /** Stores what the running run generated. */
  abstract saveContent(
    recordingId: UUID,
    runId: UUID,
    generated: GeneratedRecordingSummary,
  ): Promise<boolean>;
  /** Completes a running run whose content is stored. */
  abstract markReady(recordingId: UUID, runId: UUID): Promise<boolean>;
  /** Fails a queued or running run. */
  abstract markFailed(
    recordingId: UUID,
    runId: UUID,
    failure: RecordingSummaryFailure,
  ): Promise<boolean>;
}
