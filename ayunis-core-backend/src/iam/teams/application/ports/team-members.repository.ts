import type { UUID } from 'crypto';
import type { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import type { Paginated, PaginatedQueryParams } from 'src/common/pagination';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export abstract class TeamMembersRepository {
  abstract findByTeamId(
    teamId: UUID,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<TeamMember>>;
  abstract findByTeamIdAndUserId(
    teamId: UUID,
    userId: UUID,
  ): Promise<TeamMember | null>;
  abstract findByUserId(userId: UUID): Promise<TeamMember[]>;
  abstract countByTeamIdAndRole(teamId: UUID, role: UserRole): Promise<number>;
  abstract create(teamMember: TeamMember): Promise<TeamMember>;
  abstract updateRole(
    teamId: UUID,
    userId: UUID,
    role: UserRole,
  ): Promise<void>;
  abstract createMany(teamMembers: TeamMember[]): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
  abstract deleteByTeamIdAndUserId(teamId: UUID, userId: UUID): Promise<void>;
  abstract findAllUserIdsByTeamId(teamId: UUID): Promise<UUID[]>;
  abstract findAllUserIdsByTeamIds(
    organizationId: UUID,
    teamIds: UUID[],
  ): Promise<Map<UUID, UUID[]>>;
  abstract countByTeamIds(teamIds: UUID[]): Promise<Map<UUID, number>>;
}
