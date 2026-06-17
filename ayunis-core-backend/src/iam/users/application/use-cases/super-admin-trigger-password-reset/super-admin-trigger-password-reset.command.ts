import type { UUID } from 'crypto';

export class SuperAdminTriggerPasswordResetCommand {
  constructor(public readonly userId: UUID) {}
}
