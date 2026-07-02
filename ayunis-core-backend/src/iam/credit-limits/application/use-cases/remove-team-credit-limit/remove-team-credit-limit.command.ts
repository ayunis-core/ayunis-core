import type { UUID } from 'crypto';

export class RemoveTeamCreditLimitCommand {
  constructor(public readonly teamId: UUID) {}
}
