import type { TeamAdminSummary } from 'src/iam/teams/domain/team-admin-summary';
import type { Team } from 'src/iam/teams/domain/team.entity';

export interface TeamWithAdmins {
  team: Team;
  teamAdmins: TeamAdminSummary[];
}
