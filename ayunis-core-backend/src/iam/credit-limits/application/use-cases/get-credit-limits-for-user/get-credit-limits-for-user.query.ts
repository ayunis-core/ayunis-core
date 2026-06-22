import type { UUID } from 'crypto';

export class GetCreditLimitsForUserQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly userId: UUID,
  ) {}
}
