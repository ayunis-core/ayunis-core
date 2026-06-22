import type { UUID } from 'crypto';

export class RemoveUserCreditLimitCommand {
  constructor(public readonly userId: UUID) {}
}
