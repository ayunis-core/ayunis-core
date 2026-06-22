import type { UUID } from 'crypto';

export class SetUserCreditLimitCommand {
  constructor(
    public readonly targetUserId: UUID,
    public readonly monthlyCredits: number,
  ) {}
}
