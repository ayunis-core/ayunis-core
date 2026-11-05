import type { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import type { Team } from 'src/iam/teams/domain/team.entity';

export interface TeamWithAccess {
  team: Team;
  access: TeamAccess;
}
