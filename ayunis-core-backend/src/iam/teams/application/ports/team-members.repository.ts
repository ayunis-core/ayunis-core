import { UUID } from 'crypto';
import { TeamMember } from '../../domain/team-member.entity';
import { Paginated, PaginatedQueryParams } from 'src/common/pagination';

export abstract class TeamMembersRepository {
  abstract findByTeamId(
    teamId: UUID,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<TeamMember>>;
  abstract findByTeamIdAndUserId(
    teamId: UUID,
    userId: UUID,
  ): Promise<TeamMember | null>;
  abstract create(teamMember: TeamMember): Promise<TeamMember>;
  abstract delete(id: UUID): Promise<void>;
  abstract deleteByTeamIdAndUserId(teamId: UUID, userId: UUID): Promise<void>;
  abstract findAllUserIdsByTeamId(teamId: UUID): Promise<UUID[]>;
}
