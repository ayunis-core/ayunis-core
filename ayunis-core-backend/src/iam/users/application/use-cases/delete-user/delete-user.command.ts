import { UUID } from 'crypto';

export class DeleteUserCommand {
  public readonly userId: UUID;
  public readonly orgId: UUID;
  public readonly requestUserId: UUID;

  constructor(params: { userId: UUID; orgId: UUID; requestUserId: UUID }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.requestUserId = params.requestUserId;
  }
}
