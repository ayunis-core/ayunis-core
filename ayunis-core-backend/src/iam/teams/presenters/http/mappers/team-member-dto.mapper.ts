import { Injectable } from '@nestjs/common';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamMemberResponseDto } from '../dtos/team-member-response.dto';
import { TeamDetailResponseDto } from '../dtos/team-detail-response.dto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Injectable()
export class TeamMemberDtoMapper {
  toDto(teamMember: TeamMember): TeamMemberResponseDto {
    return {
      id: teamMember.id,
      userId: teamMember.userId,
      userName: teamMember.user?.name ?? '',
      userEmail: teamMember.user?.email ?? '',
      userRole: teamMember.user?.role ?? UserRole.USER,
      joinedAt: teamMember.createdAt,
    };
  }

  toDtoList(teamMembers: TeamMember[]): TeamMemberResponseDto[] {
    return teamMembers.map((member) => this.toDto(member));
  }

  toDetailDto(team: Team): TeamDetailResponseDto {
    return {
      id: team.id,
      name: team.name,
      orgId: team.orgId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }
}
