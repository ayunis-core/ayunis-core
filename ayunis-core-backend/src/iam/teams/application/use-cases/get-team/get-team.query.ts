import type { UUID } from 'crypto';

export class GetTeamQuery {
  public readonly teamId: UUID;

  constructor(
    teamId: UUID,
    public readonly orgId?: UUID,
  ) {
    this.teamId = teamId;
  }
}
