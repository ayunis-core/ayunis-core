import type { UUID } from 'crypto';

export class FailRecordingSummaryCommand {
  constructor(
    public readonly recordingId: UUID,
    public readonly runId: UUID,
    /** What ended the run's last attempt. */
    public readonly error: unknown,
  ) {}
}
