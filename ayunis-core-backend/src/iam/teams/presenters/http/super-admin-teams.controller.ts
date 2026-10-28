import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { ListTeamMembersUseCase } from 'src/iam/teams/application/use-cases/list-team-members/list-team-members.use-case';
import { ListTeamMembersQuery } from 'src/iam/teams/application/use-cases/list-team-members/list-team-members.query';
import { AddTeamMemberUseCase } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.use-case';
import { AddTeamMemberCommand } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.command';
import { RemoveTeamMemberUseCase } from 'src/iam/teams/application/use-cases/remove-team-member/remove-team-member.use-case';
import { RemoveTeamMemberCommand } from 'src/iam/teams/application/use-cases/remove-team-member/remove-team-member.command';
import { DeleteTeamUseCase } from 'src/iam/teams/application/use-cases/delete-team/delete-team.use-case';
import { DeleteTeamCommand } from 'src/iam/teams/application/use-cases/delete-team/delete-team.command';
import { TeamDtoMapper } from './mappers/team-dto.mapper';
import { TeamMemberDtoMapper } from './mappers/team-member-dto.mapper';
import { TeamResponseDto } from './dtos/team-response.dto';
import {
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
} from './dtos/team-member-response.dto';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { ListTeamMembersQueryDto } from './dtos/list-team-members-query.dto';

@ApiTags('super-admin-teams')
@SystemRoles(SystemRole.SUPER_ADMIN)
@Controller('super-admin/orgs/:orgId/teams')
export class SuperAdminTeamsController {
  constructor(
    private readonly listTeams: ListTeamsUseCase,
    private readonly listMembers: ListTeamMembersUseCase,
    private readonly addMember: AddTeamMemberUseCase,
    private readonly removeMember: RemoveTeamMemberUseCase,
    private readonly deleteTeam: DeleteTeamUseCase,
    private readonly teamsMapper: TeamDtoMapper,
    private readonly membersMapper: TeamMemberDtoMapper,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: [TeamResponseDto] })
  async getTeams(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
  ): Promise<TeamResponseDto[]> {
    return this.teamsMapper.toDtoListWithMemberCount(
      await this.listTeams.execute(orgId),
    );
  }

  @Get(':teamId/members')
  @ApiResponse({ status: 200, type: PaginatedTeamMembersResponseDto })
  async getMembers(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Query() query: ListTeamMembersQueryDto,
  ): Promise<PaginatedTeamMembersResponseDto> {
    const result = await this.listMembers.execute(
      new ListTeamMembersQuery({
        orgId,
        teamId,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      }),
    );
    return {
      data: this.membersMapper.toDtoList(result.data),
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      },
    };
  }

  @Post(':teamId/members')
  @ApiResponse({ status: 201, type: TeamMemberResponseDto })
  async createMember(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.membersMapper.toDto(
      await this.addMember.execute(
        new AddTeamMemberCommand({ orgId, teamId, userId: dto.userId }),
      ),
    );
  }

  @Delete(':teamId/members/:userId')
  @HttpCode(204)
  async deleteMember(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    await this.removeMember.execute(
      new RemoveTeamMemberCommand({ orgId, teamId, userId }),
    );
  }

  @Delete(':teamId')
  @HttpCode(204)
  async removeTeam(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<void> {
    await this.deleteTeam.execute(new DeleteTeamCommand(teamId, orgId));
  }
}
