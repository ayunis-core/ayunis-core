import type { UUID } from 'crypto';

interface MonthlyCreditsSnapshotProps {
  organizationId: UUID;
  periodStart: Date;
  periodEnd: Date;
  creditsConsumed: number;
}

export class MonthlyCreditsSnapshotEvent {
  static readonly EVENT_NAME = 'usage.monthly_credits_snapshot';

  readonly organizationId: UUID;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly creditsConsumed: number;

  constructor(props: MonthlyCreditsSnapshotProps) {
    this.organizationId = props.organizationId;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this.creditsConsumed = props.creditsConsumed;
  }
}
