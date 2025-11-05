import { UUID } from 'crypto';

export class GetUsageStatsQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}
