import type { UUID } from 'crypto';

export class DeleteUserCommand {
  public readonly userId: UUID;
  public readonly orgId: UUID;

  constructor(params: { userId: UUID; orgId: UUID }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
  }
}
