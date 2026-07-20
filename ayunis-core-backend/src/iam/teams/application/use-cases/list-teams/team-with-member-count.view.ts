import type { Team } from 'src/iam/teams/domain/team.entity';

export interface TeamWithMemberCount {
  team: Team;
  memberCount: number;
}
