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
import { CreateTeamUseCase } from '../../application/use-cases/create-team/create-team.use-case';
import { CreateTeamCommand } from '../../application/use-cases/create-team/create-team.command';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team/update-team.use-case';
import { UpdateTeamCommand } from '../../application/use-cases/update-team/update-team.command';
import { DeleteTeamUseCase } from '../../application/use-cases/delete-team/delete-team.use-case';
import { DeleteTeamCommand } from '../../application/use-cases/delete-team/delete-team.command';
import { ListTeamsUseCase } from '../../application/use-cases/list-teams/list-teams.use-case';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { TeamDtoMapper } from './mappers/team-dto.mapper';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('teams')
@Controller('teams')
@ApiExtraModels(CreateTeamDto, UpdateTeamDto, TeamResponseDto)
export class TeamsController {
  private readonly logger = new Logger(TeamsController.name);

  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly teamDtoMapper: TeamDtoMapper,
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
}
