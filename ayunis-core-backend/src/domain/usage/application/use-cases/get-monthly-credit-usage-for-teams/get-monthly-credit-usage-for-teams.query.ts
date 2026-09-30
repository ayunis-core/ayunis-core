import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForTeamsQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly teamIds: UUID[],
    public readonly since?: Date,
  ) {}
}
