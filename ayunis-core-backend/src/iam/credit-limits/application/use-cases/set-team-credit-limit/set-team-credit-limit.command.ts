import type { UUID } from 'crypto';

export class SetTeamCreditLimitCommand {
  constructor(
    public readonly targetTeamId: UUID,
    public readonly monthlyCredits: number,
  ) {}
}
