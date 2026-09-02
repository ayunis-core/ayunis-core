import type { UUID } from 'crypto';

export class UnlockUserAccountCommand {
  constructor(public readonly userId: UUID) {}
}
