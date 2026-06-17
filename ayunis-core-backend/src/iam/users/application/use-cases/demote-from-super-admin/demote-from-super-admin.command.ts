import type { UUID } from 'crypto';

export class DemoteFromSuperAdminCommand {
  public readonly userId: UUID;
  public readonly requestingUserId: UUID;

  constructor(params: { userId: UUID; requestingUserId: UUID }) {
    this.userId = params.userId;
    this.requestingUserId = params.requestingUserId;
  }
}
