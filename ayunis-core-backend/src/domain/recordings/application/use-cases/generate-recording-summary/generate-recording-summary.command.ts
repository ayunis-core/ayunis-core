import type { UUID } from 'crypto';

export class GenerateRecordingSummaryCommand {
  constructor(
    public readonly recordingId: UUID,
    public readonly runId: UUID,
    /** Who the run is billed to; the caller acts as this user. */
    public readonly billedUserId: UUID,
  ) {}
}
