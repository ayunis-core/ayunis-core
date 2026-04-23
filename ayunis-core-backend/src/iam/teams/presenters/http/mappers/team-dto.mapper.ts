import { Injectable } from '@nestjs/common';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamWithMemberCount } from '../../../application/use-cases/list-teams/team-with-member-count.view';
import { TeamResponseDto } from '../dtos/team-response.dto';

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

  toDtoListWithMemberCount(views: TeamWithMemberCount[]): TeamResponseDto[] {
    return views.map(({ team, memberCount }) => ({
      ...this.toDto(team),
      memberCount,
    }));
  }
}
