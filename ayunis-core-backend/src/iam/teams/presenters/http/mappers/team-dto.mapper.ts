import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { ManageableTeam } from 'src/iam/teams/application/use-cases/list-manageable-teams/manageable-team.view';
import type { TeamWithAdmins } from 'src/iam/teams/application/use-cases/get-manageable-team/team-with-admins.view';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';
import { TeamResponseDto } from 'src/iam/teams/presenters/http/dtos/team-response.dto';

@Injectable()
export class TeamDtoMapper {
  toDto(team: Team): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      orgId: team.orgId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      modelOverrideEnabled: team.modelOverrideEnabled,
    };
  }

  toDtoList(teams: Team[]): TeamResponseDto[] {
    return teams.map((team) => this.toDto(team));
  }

  toDtoWithAdmins({ team, teamAdmins }: TeamWithAdmins): TeamResponseDto {
    return { ...this.toDto(team), teamAdmins };
  }

  toManageableDtoList(views: ManageableTeam[]): TeamResponseDto[] {
    return views.map(({ team, memberCount, teamAdmins }) => ({
      ...this.toDto(team),
      memberCount,
      teamAdmins,
    }));
  }

  toMyTeamDtoList(teams: Team[], adminTeamIds: UUID[]): TeamResponseDto[] {
    const administered = new Set(adminTeamIds);
    return teams.map((team) => ({
      ...this.toDto(team),
      isTeamAdmin: administered.has(team.id),
    }));
  }

  toDtoListWithMemberCount(views: TeamWithMemberCount[]): TeamResponseDto[] {
    return views.map(({ team, memberCount }) => ({
      ...this.toDto(team),
      memberCount,
    }));
  }
}
