import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForTeamQuery {
  constructor(
    public readonly teamId: UUID,
    public readonly since?: Date,
  ) {}
}
