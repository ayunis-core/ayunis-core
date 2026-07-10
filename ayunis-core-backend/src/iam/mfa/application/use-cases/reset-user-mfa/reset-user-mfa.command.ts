import type { UUID } from 'crypto';

export class ResetUserMfaCommand {
  constructor(public readonly targetUserId: UUID) {}
}
