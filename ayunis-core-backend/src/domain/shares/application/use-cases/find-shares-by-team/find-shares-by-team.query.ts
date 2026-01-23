import { UUID } from 'crypto';

export class FindSharesByTeamQuery {
  teamId: UUID;

  constructor(params: { teamId: UUID }) {
    this.teamId = params.teamId;
  }
}
