import type { UUID } from 'crypto';

export class RevokeAllSessionsForUserCommand {
  constructor(public readonly userId: UUID) {}
}
