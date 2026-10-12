import type { UUID } from 'crypto';

export class GetUserCreditUsageQuery {
  constructor(public readonly userIds: UUID[]) {}
}
