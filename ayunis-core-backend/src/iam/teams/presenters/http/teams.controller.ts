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
import { CreateTeamUseCase } from '../../application/use-cases/create-team/create-team.use-case';
import { CreateTeamCommand } from '../../application/use-cases/create-team/create-team.command';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team/update-team.use-case';
import { UpdateTeamCommand } from '../../application/use-cases/update-team/update-team.command';
import { DeleteTeamUseCase } from '../../application/use-cases/delete-team/delete-team.use-case';
import { DeleteTeamCommand } from '../../application/use-cases/delete-team/delete-team.command';
import { ListTeamsUseCase } from '../../application/use-cases/list-teams/list-teams.use-case';
import { ListMyTeamsUseCase } from '../../application/use-cases/list-my-teams/list-my-teams.use-case';
import { GetTeamUseCase } from '../../application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from '../../application/use-cases/get-team/get-team.query';
import { ListTeamMembersUseCase } from '../../application/use-cases/list-team-members/list-team-members.use-case';
import { ListTeamMembersQuery } from '../../application/use-cases/list-team-members/list-team-members.query';
import { AddTeamMemberUseCase } from '../../application/use-cases/add-team-member/add-team-member.use-case';
import { AddTeamMemberCommand } from '../../application/use-cases/add-team-member/add-team-member.command';
import { RemoveTeamMemberUseCase } from '../../application/use-cases/remove-team-member/remove-team-member.use-case';
import { RemoveTeamMemberCommand } from '../../application/use-cases/remove-team-member/remove-team-member.command';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { TeamDetailResponseDto } from './dtos/team-detail-response.dto';
import {
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
} from './dtos/team-member-response.dto';
import { AddTeamMemberDto } from './dtos/add-team-member.dto';
import { ListTeamMembersQueryDto } from './dtos/list-team-members-query.dto';
import { TeamDtoMapper } from './mappers/team-dto.mapper';
import { TeamMemberDtoMapper } from './mappers/team-member-dto.mapper';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('teams')
@Controller('teams')
@ApiExtraModels(
  CreateTeamDto,
  UpdateTeamDto,
  TeamResponseDto,
  TeamDetailResponseDto,
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
  AddTeamMemberDto,
  ListTeamMembersQueryDto,
)
export class TeamsController {
  private readonly logger = new Logger(TeamsController.name);

  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly listMyTeamsUseCase: ListMyTeamsUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly listTeamMembersUseCase: ListTeamMembersUseCase,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
    private readonly removeTeamMemberUseCase: RemoveTeamMemberUseCase,
    private readonly teamDtoMapper: TeamDtoMapper,
    private readonly teamMemberDtoMapper: TeamMemberDtoMapper,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({
    summary: 'List all teams for the current organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved teams',
    type: [TeamResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to view teams',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async listTeams(): Promise<TeamResponseDto[]> {
    this.logger.log('Listing teams for organization');

    const teams = await this.listTeamsUseCase.execute();

    this.logger.log(`Successfully retrieved ${teams.length} teams`);
    return this.teamDtoMapper.toDtoList(teams);
  }

  @Get('me')
  @ApiOperation({
    summary: 'List teams the current user is a member of',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user teams',
    type: [TeamResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async listMyTeams(): Promise<TeamResponseDto[]> {
    this.logger.log('Listing teams for current user');

    const teams = await this.listMyTeamsUseCase.execute();

    this.logger.log(`Successfully retrieved ${teams.length} teams for user`);
    return this.teamDtoMapper.toDtoList(teams);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({
    summary: 'Get a team by ID with member count',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved team',
    schema: {
      $ref: getSchemaPath(TeamDetailResponseDto),
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to view teams',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getTeam(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<TeamDetailResponseDto> {
    this.logger.log(`Getting team with id: ${id}`);

    const query = new GetTeamQuery(id);
    const response = await this.getTeamUseCase.execute(query);

    this.logger.log(`Successfully retrieved team with id: ${id}`);
    return this.teamMemberDtoMapper.toDetailDto(response);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a new team for the current organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created team',
    schema: {
      $ref: getSchemaPath(TeamResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid team data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to create teams',
  })
  @ApiResponse({
    status: 409,
    description: 'Team with this name already exists in the organization',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Creating team with name: ${createTeamDto.name}`);

    const command = new CreateTeamCommand(createTeamDto.name);
    const team = await this.createTeamUseCase.execute(command);

    this.logger.log(`Successfully created team with id: ${team.id}`);
    return this.teamDtoMapper.toDto(team);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a team in the current organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated team',
    schema: {
      $ref: getSchemaPath(TeamResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid team data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to update teams',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Team with this name already exists in the organization',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateTeam(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Updating team ${id} with name: ${updateTeamDto.name}`);

    const command = new UpdateTeamCommand(id, updateTeamDto.name);
    const team = await this.updateTeamUseCase.execute(command);

    this.logger.log(`Successfully updated team with id: ${team.id}`);
    return this.teamDtoMapper.toDto(team);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a team from the current organization',
  })
  @ApiResponse({
    status: 204,
    description: 'Team successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to delete teams',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async deleteTeam(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log(`Deleting team with id: ${id}`);

    const command = new DeleteTeamCommand(id);
    await this.deleteTeamUseCase.execute(command);

    this.logger.log(`Successfully deleted team with id: ${id}`);
  }

  @Roles(UserRole.ADMIN)
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async listTeamMembers(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryDto: ListTeamMembersQueryDto,
  ): Promise<PaginatedTeamMembersResponseDto> {
    this.logger.log(`Listing members for team: ${id}`);

    const query = new ListTeamMembersQuery({
      teamId: id,
      limit: queryDto.limit ?? 50,
      offset: queryDto.offset ?? 0,
    });
    const result = await this.listTeamMembersUseCase.execute(query);

    this.logger.log(
      `Successfully retrieved ${result.data.length} members for team: ${id}`,
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

  @Roles(UserRole.ADMIN)
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async addTeamMember(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    this.logger.log(`Adding user ${addTeamMemberDto.userId} to team: ${id}`);

    const command = new AddTeamMemberCommand({
      teamId: id,
      userId: addTeamMemberDto.userId,
    });
    const teamMember = await this.addTeamMemberUseCase.execute(command);

    this.logger.log(
      `Successfully added user ${addTeamMemberDto.userId} to team: ${id}`,
    );
    return this.teamMemberDtoMapper.toDto(teamMember);
  }

  @Roles(UserRole.ADMIN)
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
    this.logger.log(`Removing user ${userId} from team: ${id}`);

    const command = new RemoveTeamMemberCommand({
      teamId: id,
      userId,
    });
    await this.removeTeamMemberUseCase.execute(command);

    this.logger.log(`Successfully removed user ${userId} from team: ${id}`);
  }
}
