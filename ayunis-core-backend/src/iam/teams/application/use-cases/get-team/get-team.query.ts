import { UUID } from 'crypto';

export class GetTeamQuery {
  public readonly teamId: UUID;

  constructor(teamId: UUID) {
    this.teamId = teamId;
  }
}
