import type { UUID } from 'crypto';

export class StartRecordingSummaryCommand {
  constructor(
    public readonly audioSourceId: UUID,
    public readonly orgId: UUID,
  ) {}
}
