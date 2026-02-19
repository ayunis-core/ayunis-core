import type { UUID } from 'crypto';

export class IncrementTrialMessagesCommand {
  constructor(public readonly orgId: UUID) {}
}
