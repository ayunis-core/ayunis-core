import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CreateTeamUseCase } from 'src/iam/teams/application/use-cases/create-team/create-team.use-case';
import { CreateTeamCommand } from 'src/iam/teams/application/use-cases/create-team/create-team.command';
import { UpdateTeamUseCase } from 'src/iam/teams/application/use-cases/update-team/update-team.use-case';
import { UpdateTeamCommand } from 'src/iam/teams/application/use-cases/update-team/update-team.command';
import { DeleteTeamUseCase } from 'src/iam/teams/application/use-cases/delete-team/delete-team.use-case';
import { DeleteTeamCommand } from 'src/iam/teams/application/use-cases/delete-team/delete-team.command';
import { ListManageableTeamsUseCase } from 'src/iam/teams/application/use-cases/list-manageable-teams/list-manageable-teams.use-case';
import { ListMyTeamAccessUseCase } from 'src/iam/teams/application/use-cases/list-my-team-access/list-my-team-access.use-case';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { MyTeamResponseDto } from './dtos/my-team-response.dto';
import { TeamRolePermissionsResponseDto } from './dtos/team-role-permissions-response.dto';
import { GetTeamRolePermissionsUseCase } from 'src/iam/teams/application/use-cases/get-team-role-permissions/get-team-role-permissions.use-case';
import { GetTeamRolePermissionsQuery } from 'src/iam/teams/application/use-cases/get-team-role-permissions/get-team-role-permissions.query';
import { TeamDtoMapper } from './mappers/team-dto.mapper';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import {
  RequireTeamPermission,
  TEAM_READ_PERMISSIONS,
} from 'src/iam/teams/application/decorators/team-permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@ApiTags('teams')
@Controller('teams')
@ApiExtraModels(CreateTeamDto, UpdateTeamDto, TeamResponseDto)
export class TeamsController {
  private readonly logger = new Logger(TeamsController.name);

  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly listManageableTeamsUseCase: ListManageableTeamsUseCase,
    private readonly listMyTeamAccessUseCase: ListMyTeamAccessUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly getTeamRolePermissionsUseCase: GetTeamRolePermissionsUseCase,
    private readonly teamDtoMapper: TeamDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the teams the current user may manage',
    description:
      'Organisation-wide team managers get every team in the organisation; ' +
      'anyone else gets the teams their team role lets them manage.',
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
    status: 500,
    description: 'Internal server error',
  })
  async listTeams(): Promise<TeamResponseDto[]> {
    this.logger.log('Listing teams for organization');

    const teams = await this.listManageableTeamsUseCase.execute();

    this.logger.log(
      { teamCount: teams.length },
      'Successfully retrieved teams',
    );
    return this.teamDtoMapper.toDtoListWithMemberCount(teams);
  }

  @Get('me')
  @ApiOperation({
    summary: 'List teams the current user is a member of',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user teams',
    type: [MyTeamResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async listMyTeams(): Promise<MyTeamResponseDto[]> {
    this.logger.log('Listing teams for current user');

    const teams = await this.listMyTeamAccessUseCase.execute();

    this.logger.log(
      { teamCount: teams.length },
      'Successfully retrieved teams for user',
    );
    return this.teamDtoMapper.toMyTeamDtoList(teams);
  }

  @RequireTeamPermission(...TEAM_READ_PERMISSIONS)
  @Get(':id')
  @ApiOperation({
    summary: 'Get a team by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved team',
    schema: {
      $ref: getSchemaPath(TeamResponseDto),
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
  ): Promise<TeamResponseDto> {
    this.logger.log({ teamId: id }, 'Getting team');

    const query = new GetTeamQuery(id);
    const response = await this.getTeamUseCase.execute(query);

    this.logger.log({ teamId: id }, 'Successfully retrieved team');
    return this.teamDtoMapper.toDto(response);
  }

  @RequireTeamPermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @Get(':id/role-permissions')
  @ApiOperation({ summary: 'What each team role grants within a team' })
  @ApiResponse({ status: 200, type: TeamRolePermissionsResponseDto })
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamRolePermissions(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<TeamRolePermissionsResponseDto> {
    const roles = await this.getTeamRolePermissionsUseCase.execute(
      new GetTeamRolePermissionsQuery(id),
    );
    return { roles };
  }

  @RequirePermission(Permission.MANAGE_TEAMS)
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
    this.logger.log({ name: createTeamDto.name }, 'Creating team');

    const command = new CreateTeamCommand(createTeamDto.name);
    const team = await this.createTeamUseCase.execute(command);

    this.logger.log({ teamId: team.id }, 'Successfully created team');
    return this.teamDtoMapper.toDto(team);
  }

  @RequireTeamPermission(Permission.MANAGE_TEAMS)
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
  async updateTeam(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log({ teamId: id, ...updateTeamDto }, 'Updating team');

    const command = new UpdateTeamCommand(
      id,
      updateTeamDto.name,
      updateTeamDto.modelOverrideEnabled,
    );
    const team = await this.updateTeamUseCase.execute(command);

    this.logger.log({ teamId: team.id }, 'Successfully updated team');
    return this.teamDtoMapper.toDto(team);
  }

  @RequirePermission(Permission.MANAGE_TEAMS)
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
    this.logger.log({ teamId: id }, 'Deleting team');

    const command = new DeleteTeamCommand(id);
    await this.deleteTeamUseCase.execute(command);

    this.logger.log({ teamId: id }, 'Successfully deleted team');
  }
}
