import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageForUsersQuery {
  constructor(
    public readonly userIds: UUID[],
    public readonly since?: Date,
  ) {}
}
