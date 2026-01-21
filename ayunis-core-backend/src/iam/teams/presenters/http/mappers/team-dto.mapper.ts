import { Injectable } from '@nestjs/common';
import { Team } from 'src/iam/teams/domain/team.entity';
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
    };
  }

  toDtoList(teams: Team[]): TeamResponseDto[] {
    return teams.map((team) => this.toDto(team));
  }
}
