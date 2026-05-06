import type { UUID } from 'crypto';

export class SendFirstStepsEmailCommand {
  constructor(public readonly userId: UUID) {}
}
