import { UUID } from 'crypto';

export class CheckUserTeamMembershipQuery {
  public readonly userId: UUID;
  public readonly teamId: UUID;

  constructor(params: { userId: UUID; teamId: UUID }) {
    this.userId = params.userId;
    this.teamId = params.teamId;
  }
}
