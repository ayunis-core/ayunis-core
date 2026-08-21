import type { UUID } from 'crypto';

export class RevokeSsoSessionsForUserCommand {
  constructor(public readonly userId: UUID) {}
}
