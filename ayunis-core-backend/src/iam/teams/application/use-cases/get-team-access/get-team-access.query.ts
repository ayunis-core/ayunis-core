import type { UUID } from 'crypto';
import type { TeamPrincipal } from 'src/iam/teams/application/services/team-access.service';

export class GetTeamAccessQuery {
  constructor(
    public readonly principal: TeamPrincipal,
    public readonly teamId: UUID,
  ) {}
}
