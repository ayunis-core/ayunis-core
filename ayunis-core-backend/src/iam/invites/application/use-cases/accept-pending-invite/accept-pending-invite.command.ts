import type { UUID } from 'crypto';

export class AcceptPendingInviteCommand {
  constructor(public readonly inviteId: UUID) {}
}
