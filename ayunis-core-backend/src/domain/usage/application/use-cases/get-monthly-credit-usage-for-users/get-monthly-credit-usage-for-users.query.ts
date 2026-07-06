import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForUsersQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly userIds: UUID[],
    public readonly since?: Date,
  ) {}
}
