import type { UUID } from 'crypto';
import type { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import type { Paginated, PaginatedQueryParams } from 'src/common/pagination';
import type { TeamAdminSummary } from 'src/iam/teams/domain/team-admin-summary';

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
  abstract createMany(teamMembers: TeamMember[]): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
  abstract deleteByTeamIdAndUserId(teamId: UUID, userId: UUID): Promise<void>;
  abstract findAllUserIdsByTeamId(teamId: UUID): Promise<UUID[]>;
  abstract findAllUserIdsByTeamIds(
    organizationId: UUID,
    teamIds: UUID[],
  ): Promise<Map<UUID, UUID[]>>;
  abstract countByTeamIds(teamIds: UUID[]): Promise<Map<UUID, number>>;
  abstract setTeamAdmin(
    teamId: UUID,
    userId: UUID,
    isTeamAdmin: boolean,
  ): Promise<void>;
  abstract lockTeamAdminUserIds(teamId: UUID): Promise<UUID[]>;
  abstract findAdminTeamIdsByUserId(userId: UUID): Promise<UUID[]>;
  abstract findTeamAdminsByTeamIds(
    teamIds: UUID[],
  ): Promise<Map<UUID, TeamAdminSummary[]>>;
}
