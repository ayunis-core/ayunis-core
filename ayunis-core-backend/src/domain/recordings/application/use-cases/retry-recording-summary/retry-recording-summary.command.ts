import type { UUID } from 'crypto';

export class RetryRecordingSummaryCommand {
  constructor(public readonly recordingId: UUID) {}
}
