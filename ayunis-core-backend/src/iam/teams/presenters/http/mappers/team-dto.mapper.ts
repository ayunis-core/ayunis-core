import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';
import type { TeamWithAccess } from 'src/iam/teams/application/use-cases/list-my-team-access/team-with-access.view';
import { TeamResponseDto } from 'src/iam/teams/presenters/http/dtos/team-response.dto';
import { MyTeamResponseDto } from 'src/iam/teams/presenters/http/dtos/my-team-response.dto';

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

  toMyTeamDtoList(views: TeamWithAccess[]): MyTeamResponseDto[] {
    return views.map(({ team, access }) => ({
      ...this.toDto(team),
      role: access.teamRole ?? UserRole.USER,
      permissions: access.permissions,
    }));
  }

  toDtoListWithMemberCount(views: TeamWithMemberCount[]): TeamResponseDto[] {
    return views.map(({ team, memberCount }) => ({
      ...this.toDto(team),
      memberCount,
    }));
  }
}
