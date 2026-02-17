import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

// Import use cases
import { CreateShareUseCase } from '../../application/use-cases/create-share/create-share.use-case';
import {
  CreateOrgAgentShareCommand,
  CreateTeamAgentShareCommand,
  CreateOrgSkillShareCommand,
  CreateTeamSkillShareCommand,
} from '../../application/use-cases/create-share/create-share.command';
import { DeleteShareUseCase } from '../../application/use-cases/delete-share/delete-share.use-case';
import { GetSharesUseCase } from '../../application/use-cases/get-shares/get-shares.use-case';
import { GetSharesQuery } from '../../application/use-cases/get-shares/get-shares.query';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';

// Import DTOs and mappers
import { ShareResponseDto } from './dto/share-response.dto';
import {
  CreateAgentShareDto,
  CreateSkillShareDto,
} from './dto/create-share.dto';
import { ShareDtoMapper } from './mappers/share-dto.mapper';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { TeamShareScope } from '../../domain/share-scope.entity';

@ApiTags('shares')
@Controller('shares')
export class SharesController {
  private readonly logger = new Logger(SharesController.name);

  constructor(
    private readonly createShareUseCase: CreateShareUseCase,
    private readonly deleteShareUseCase: DeleteShareUseCase,
    private readonly getSharesUseCase: GetSharesUseCase,
    private readonly shareDtoMapper: ShareDtoMapper,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a share for an agent' })
  @ApiBody({
    description: 'Share creation data',
    type: CreateAgentShareDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Share created successfully',
    type: ShareResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User cannot create share for this entity',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createShare(
    @Body() createShareDto: CreateAgentShareDto,
  ): Promise<ShareResponseDto> {
    this.logger.log('createShare', {
      entityType: createShareDto.entityType,
      agentId: createShareDto.agentId,
      teamId: createShareDto.teamId,
    });

    // Create command based on whether teamId is provided
    const command = createShareDto.teamId
      ? new CreateTeamAgentShareCommand(
          createShareDto.agentId as UUID,
          createShareDto.teamId as UUID,
        )
      : new CreateOrgAgentShareCommand(createShareDto.agentId as UUID);

    // Execute use case
    const share = await this.createShareUseCase.execute(command);

    // Map to response DTO with team name if applicable
    if (share.scope.scopeType === ShareScopeType.TEAM) {
      const teamScope = share.scope as TeamShareScope;
      const team = await this.getTeamUseCase.execute(
        new GetTeamQuery(teamScope.teamId),
      );
      return this.shareDtoMapper.toDto(share, team.name);
    }

    return this.shareDtoMapper.toDto(share);
  }

  @Post('skills')
  @ApiOperation({ summary: 'Create a share for a skill' })
  @ApiBody({
    description: 'Skill share creation data',
    type: CreateSkillShareDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Share created successfully',
    type: ShareResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User cannot create share for this skill',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createSkillShare(
    @Body() dto: CreateSkillShareDto,
  ): Promise<ShareResponseDto> {
    this.logger.log('createSkillShare', {
      skillId: dto.skillId,
      teamId: dto.teamId,
    });

    const command = dto.teamId
      ? new CreateTeamSkillShareCommand(dto.skillId as UUID, dto.teamId as UUID)
      : new CreateOrgSkillShareCommand(dto.skillId as UUID);

    const share = await this.createShareUseCase.execute(command);

    if (share.scope.scopeType === ShareScopeType.TEAM) {
      const teamScope = share.scope as TeamShareScope;
      const team = await this.getTeamUseCase.execute(
        new GetTeamQuery(teamScope.teamId),
      );
      return this.shareDtoMapper.toDto(share, team.name);
    }

    return this.shareDtoMapper.toDto(share);
  }

  @Get()
  @ApiOperation({ summary: 'Get shares for an entity' })
  @ApiQuery({
    name: 'entityId',
    required: true,
    type: 'string',
    format: 'uuid',
    description: 'ID of the entity to get shares for',
  })
  @ApiQuery({
    name: 'entityType',
    required: true,
    enum: SharedEntityType,
    description: 'Type of the entity',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns shares for the specified entity',
    type: [ShareResponseDto],
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({
    status: 403,
    description: 'User cannot view shares for this entity',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getShares(
    @Query('entityId', ParseUUIDPipe) entityId: UUID,
    @Query('entityType') entityType: SharedEntityType,
  ): Promise<ShareResponseDto[]> {
    this.logger.log('getShares', { entityId, entityType });

    const shares = await this.getSharesUseCase.execute(
      new GetSharesQuery(entityId, entityType),
    );

    // Build team names map for team-scoped shares
    const teamNamesMap = new Map<string, string>();
    for (const share of shares) {
      if (share.scope.scopeType === ShareScopeType.TEAM) {
        const teamScope = share.scope as TeamShareScope;
        if (!teamNamesMap.has(teamScope.teamId)) {
          const team = await this.getTeamUseCase.execute(
            new GetTeamQuery(teamScope.teamId),
          );
          teamNamesMap.set(teamScope.teamId, team.name);
        }
      }
    }

    return this.shareDtoMapper.toDtoArray(shares, teamNamesMap);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a share' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the share to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The share has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShare(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('deleteShare', { id });

    await this.deleteShareUseCase.execute(id);
  }
}
