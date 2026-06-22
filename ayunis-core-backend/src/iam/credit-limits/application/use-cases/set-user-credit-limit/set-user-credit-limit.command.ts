import type { UUID } from 'crypto';

export class SetUserCreditLimitCommand {
  constructor(
    public readonly userId: UUID,
    public readonly monthlyCredits: number,
  ) {}
}
