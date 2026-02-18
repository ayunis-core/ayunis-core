import { UUID } from 'crypto';

export class DeleteTeamCommand {
  public readonly teamId: UUID;

  constructor(teamId: UUID) {
    this.teamId = teamId;
  }
}
