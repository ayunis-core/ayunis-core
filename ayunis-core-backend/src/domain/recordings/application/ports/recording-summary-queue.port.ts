import type { UUID } from 'crypto';

export interface RecordingSummaryJobData {
  recordingId: UUID;
  runId: UUID;
  orgId: UUID;
  /** Who the run is billed to. */
  userId: UUID;
}

export abstract class RecordingSummaryQueue {
  /** One job per run: enqueuing the same run again adds nothing. */
  abstract enqueue(job: RecordingSummaryJobData): Promise<void>;
}
