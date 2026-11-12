import type { UUID } from 'crypto';
import type { RecordingSummaryFailure } from './recording-summary-failure.enum';
import { RecordingSummaryStatus } from './recording-summary-status.enum';

export interface RecordingSummaryParams {
  recordingId: UUID;
  runId: UUID;
  status: RecordingSummaryStatus;
  triggeredByUserId: UUID | null;
  content?: string | null;
  modelId?: UUID | null;
  modelName?: string | null;
  generatedAt?: Date | null;
  failure?: RecordingSummaryFailure | null;
}

/**
 * The summary ("Protokoll") of a recording's transcript, generated in the
 * background from the built-in template. Each run is identified by `runId`:
 * the automatic run after transcription and every "Try again" start a new
 * one, and only the current run may write its result.
 */
export class RecordingSummary {
  readonly recordingId: UUID;
  readonly runId: UUID;
  readonly status: RecordingSummaryStatus;
  /**
   * Who the run is billed to: the uploader for the automatic run, whoever
   * asked to try again otherwise; null once that user is deleted.
   */
  readonly triggeredByUserId: UUID | null;
  /** Markdown; kept once generated, also when indexing it failed. */
  readonly content: string | null;
  /** The catalogue model that generated it; null once that model is deleted. */
  readonly modelId: UUID | null;
  readonly modelName: string | null;
  readonly generatedAt: Date | null;
  /** Only for a failed summary. */
  readonly failure: RecordingSummaryFailure | null;

  constructor(params: RecordingSummaryParams) {
    this.recordingId = params.recordingId;
    this.runId = params.runId;
    this.status = params.status;
    this.triggeredByUserId = params.triggeredByUserId;
    this.content = params.content ?? null;
    this.modelId = params.modelId ?? null;
    this.modelName = params.modelName ?? null;
    this.generatedAt = params.generatedAt ?? null;
    this.failure = params.failure ?? null;
  }

  get isInProgress(): boolean {
    return (
      this.status === RecordingSummaryStatus.PENDING ||
      this.status === RecordingSummaryStatus.RUNNING
    );
  }
}
