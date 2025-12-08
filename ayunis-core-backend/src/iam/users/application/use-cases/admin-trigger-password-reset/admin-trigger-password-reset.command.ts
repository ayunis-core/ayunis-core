import { UUID } from 'crypto';

export class AdminTriggerPasswordResetCommand {
  constructor(public readonly userId: UUID) {}
}
