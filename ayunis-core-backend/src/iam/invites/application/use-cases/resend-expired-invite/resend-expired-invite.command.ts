import type { UUID } from 'crypto';

export class ResendExpiredInviteCommand {
  public readonly inviteId: UUID;
  public readonly orgId: UUID;

  constructor(params: { inviteId: UUID; orgId: UUID }) {
    this.inviteId = params.inviteId;
    this.orgId = params.orgId;
  }
}
