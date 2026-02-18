import { UUID } from 'crypto';

export class DeleteInviteCommand {
  public readonly inviteId: UUID;

  constructor(inviteId: UUID) {
    this.inviteId = inviteId;
  }
}
