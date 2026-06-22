import type { UUID } from 'crypto';

export class SetTeamCreditLimitCommand {
  constructor(
    public readonly teamId: UUID,
    public readonly monthlyCredits: number,
  ) {}
}
