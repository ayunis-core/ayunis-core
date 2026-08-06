import type { UUID } from 'crypto';

export class MarkWelcomeVideoSeenCommand {
  constructor(public readonly userId: UUID) {}
}
