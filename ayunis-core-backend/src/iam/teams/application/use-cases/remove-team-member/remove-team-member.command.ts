import type { UUID } from 'crypto';

export class RemoveTeamMemberCommand {
  public readonly teamId: UUID;
  public readonly userId: UUID;

  constructor(params: { teamId: UUID; userId: UUID }) {
    this.teamId = params.teamId;
    this.userId = params.userId;
  }
}
