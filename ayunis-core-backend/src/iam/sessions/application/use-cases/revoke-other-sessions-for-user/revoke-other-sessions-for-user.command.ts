import type { UUID } from 'crypto';

export class RevokeOtherSessionsForUserCommand {
  constructor(
    public readonly userId: UUID,
    public readonly currentRefreshToken: string | undefined,
  ) {}
}
