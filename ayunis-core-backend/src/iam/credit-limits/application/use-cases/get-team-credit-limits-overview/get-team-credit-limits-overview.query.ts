import type { UUID } from 'crypto';

export class GetTeamCreditLimitsOverviewQuery {
  constructor(
    public readonly since?: Date,
    public readonly orgId?: UUID,
  ) {}
}
