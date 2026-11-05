import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ListTeamMembersUseCase } from 'src/iam/teams/application/use-cases/list-team-members/list-team-members.use-case';
import { ListTeamMembersQuery } from 'src/iam/teams/application/use-cases/list-team-members/list-team-members.query';
import { AddTeamMemberUseCase } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.use-case';
import { AddTeamMemberCommand } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.command';
import { BulkAddTeamMembersUseCase } from 'src/iam/teams/application/use-cases/bulk-add-team-members/bulk-add-team-members.use-case';
import { BulkAddTeamMembersCommand } from 'src/iam/teams/application/use-cases/bulk-add-team-members/bulk-add-team-members.command';
import { RemoveTeamMemberUseCase } from 'src/iam/teams/application/use-cases/remove-team-member/remove-team-member.use-case';
import { RemoveTeamMemberCommand } from 'src/iam/teams/application/use-cases/remove-team-member/remove-team-member.command';
import { UpdateTeamMemberRoleUseCase } from 'src/iam/teams/application/use-cases/update-team-member-role/update-team-member-role.use-case';
import { UpdateTeamMemberRoleCommand } from 'src/iam/teams/application/use-cases/update-team-member-role/update-team-member-role.command';
import {
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
} from './dtos/team-member-response.dto';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { BulkAddTeamMembersDto } from './dtos/bulk-add-team-members.dto';
import { ListTeamMembersQueryDto } from './dtos/list-team-members-query.dto';
import { UpdateTeamMemberRoleDto } from './dtos/update-team-member-role.dto';
import { TeamMemberDtoMapper } from './mappers/team-member-dto.mapper';
import {
  RequireTeamPermission,
  TEAM_READ_PERMISSIONS,
} from 'src/iam/teams/application/decorators/team-permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@ApiTags('teams')
@Controller('teams')
@ApiExtraModels(
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
  AddTeamMemberDto,
  ListTeamMembersQueryDto,
  UpdateTeamMemberRoleDto,
)
export class TeamMembersController {
  private readonly logger = new Logger(TeamMembersController.name);

  constructor(
    private readonly listTeamMembersUseCase: ListTeamMembersUseCase,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
    private readonly bulkAddTeamMembersUseCase: BulkAddTeamMembersUseCase,
    private readonly removeTeamMemberUseCase: RemoveTeamMemberUseCase,
    private readonly updateTeamMemberRoleUseCase: UpdateTeamMemberRoleUseCase,
    private readonly teamMemberDtoMapper: TeamMemberDtoMapper,
  ) {}

  @RequireTeamPermission(...TEAM_READ_PERMISSIONS)
  @Get(':id/members')
  @ApiOperation({
    summary: 'List members of a team',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved team members',
    schema: {
      $ref: getSchemaPath(PaginatedTeamMembersResponseDto),
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to view team members',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  async listTeamMembers(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryDto: ListTeamMembersQueryDto,
  ): Promise<PaginatedTeamMembersResponseDto> {
    this.logger.log({ teamId: id }, 'Listing members for team');

    const query = new ListTeamMembersQuery({
      teamId: id,
      limit: queryDto.limit ?? 50,
      offset: queryDto.offset ?? 0,
    });
    const result = await this.listTeamMembersUseCase.execute(query);

    this.logger.log(
      { teamId: id, memberCount: result.data.length },
      'Successfully retrieved members for team',
    );
    return {
      data: this.teamMemberDtoMapper.toDtoList(result.data),
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      },
    };
  }

  @RequireTeamPermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @Post(':id/members')
  @ApiOperation({
    summary: 'Add a user to a team',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully added user to team',
    schema: {
      $ref: getSchemaPath(TeamMemberResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data provided or user not in same organization',
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to add team members',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of the team',
  })
  async addTeamMember(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    const { userId } = addTeamMemberDto;
    this.logger.log({ teamId: id, userId }, 'Adding user to team');

    const command = new AddTeamMemberCommand({ teamId: id, userId });
    const teamMember = await this.addTeamMemberUseCase.execute(command);

    this.logger.log({ teamId: id, userId }, 'Successfully added user to team');
    return this.teamMemberDtoMapper.toDto(teamMember);
  }

  @RequireTeamPermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @Post(':id/members/bulk')
  @ApiOperation({
    summary: 'Add multiple users to a team at once',
    description:
      'Adds every listed user. Users already in the team, not found, or not ' +
      'in the org are skipped; the response holds only the members added.',
  })
  @ApiResponse({
    status: 201,
    description: 'Users successfully added to team',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(TeamMemberResponseDto) },
    },
  })
  async bulkAddTeamMembers(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() bulkAddTeamMembersDto: BulkAddTeamMembersDto,
  ): Promise<TeamMemberResponseDto[]> {
    this.logger.log(
      { teamId: id, userCount: bulkAddTeamMembersDto.userIds.length },
      'Adding users to team',
    );

    const command = new BulkAddTeamMembersCommand({
      teamId: id,
      userIds: bulkAddTeamMembersDto.userIds,
    });
    const teamMembers = await this.bulkAddTeamMembersUseCase.execute(command);

    this.logger.log(
      { teamId: id, userCount: teamMembers.length },
      'Successfully added users to team',
    );
    return this.teamMemberDtoMapper.toDtoList(teamMembers);
  }

  @RequireTeamPermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a user from a team',
  })
  @ApiResponse({
    status: 204,
    description: 'User successfully removed from team',
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to remove team members',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found or user is not a member of the team',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async removeTeamMember(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    this.logger.log({ teamId: id, userId }, 'Removing user from team');

    const command = new RemoveTeamMemberCommand({
      teamId: id,
      userId,
    });
    await this.removeTeamMemberUseCase.execute(command);

    this.logger.log(
      { teamId: id, userId },
      'Successfully removed user from team',
    );
  }

  // The guard admits anyone who may manage the team's members; the use case
  // narrows role changes to team admins and organisation-wide member managers.
  @RequireTeamPermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @Patch(':id/members/:userId')
  @ApiOperation({ summary: "Change a member's role within a team" })
  @ApiResponse({
    status: 200,
    description: 'Role updated',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to change team roles',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found or user is not a member of the team',
  })
  @ApiResponse({
    status: 409,
    description: 'The change would leave the team without an admin',
  })
  async updateTeamMemberRole(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: UpdateTeamMemberRoleDto,
  ): Promise<TeamMemberResponseDto> {
    this.logger.log({ teamId: id, userId, role: dto.role }, 'Updating role');

    const member = await this.updateTeamMemberRoleUseCase.execute(
      new UpdateTeamMemberRoleCommand({ teamId: id, userId, role: dto.role }),
    );
    return this.teamMemberDtoMapper.toDto(member);
  }
}
