import type { UUID } from 'crypto';

export class ResendExpiredInviteCommand {
  public readonly inviteId: UUID;

  constructor(inviteId: UUID) {
    this.inviteId = inviteId;
  }
}
