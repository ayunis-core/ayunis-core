import type { UUID } from 'crypto';
import type { User } from './user.entity';

export interface UserTeamSummary {
  id: UUID;
  name: string;
}

export type UserWithTeams = User & { teams?: UserTeamSummary[] };
