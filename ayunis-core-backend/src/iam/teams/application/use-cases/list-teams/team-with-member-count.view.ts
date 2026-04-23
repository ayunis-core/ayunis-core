import type { Team } from '../../../domain/team.entity';

export interface TeamWithMemberCount {
  team: Team;
  memberCount: number;
}
