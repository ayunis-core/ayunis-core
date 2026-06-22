import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForUserQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly userId: UUID,
    public readonly since?: Date,
  ) {}
}
