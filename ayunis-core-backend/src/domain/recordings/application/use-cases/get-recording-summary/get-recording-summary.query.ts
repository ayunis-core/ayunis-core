import type { UUID } from 'crypto';

export class GetRecordingSummaryQuery {
  constructor(public readonly recordingId: UUID) {}
}
