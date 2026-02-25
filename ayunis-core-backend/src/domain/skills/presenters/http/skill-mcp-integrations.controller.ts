import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

import { AssignMcpIntegrationToSkillUseCase } from '../../application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.use-case';
import { UnassignMcpIntegrationFromSkillUseCase } from '../../application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.use-case';
import { ListSkillMcpIntegrationsUseCase } from '../../application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.use-case';

import { AssignMcpIntegrationToSkillCommand } from '../../application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.command';
import { UnassignMcpIntegrationFromSkillCommand } from '../../application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.command';
import { ListSkillMcpIntegrationsQuery } from '../../application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.query';

import { SkillAccessService } from '../../application/services/skill-access.service';

import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@Controller('skills')
export class SkillMcpIntegrationsController {
  private readonly logger = new Logger(SkillMcpIntegrationsController.name);

  constructor(
    private readonly assignMcpIntegrationToSkillUseCase: AssignMcpIntegrationToSkillUseCase,
    private readonly unassignMcpIntegrationFromSkillUseCase: UnassignMcpIntegrationFromSkillUseCase,
    private readonly listSkillMcpIntegrationsUseCase: ListSkillMcpIntegrationsUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
    private readonly skillAccessService: SkillAccessService,
  ) {}

  @Post(':skillId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Assign MCP integration to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'integrationId',
    description: 'The UUID of the MCP integration to assign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'The MCP integration has been successfully assigned',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill or integration not found' })
  @ApiResponse({ status: 409, description: 'Integration already assigned' })
  @HttpCode(HttpStatus.CREATED)
  async assignMcpIntegration(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('assignMcpIntegration', { skillId, integrationId });

    const skill = await this.assignMcpIntegrationToSkillUseCase.execute(
      new AssignMcpIntegrationToSkillCommand(skillId, integrationId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);

    return this.skillDtoMapper.toDto(skill, context);
  }

  @Delete(':skillId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Unassign MCP integration from skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'integrationId',
    description: 'The UUID of the MCP integration to unassign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The MCP integration has been successfully unassigned',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Skill not found or integration not assigned',
  })
  async unassignMcpIntegration(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('unassignMcpIntegration', { skillId, integrationId });

    const skill = await this.unassignMcpIntegrationFromSkillUseCase.execute(
      new UnassignMcpIntegrationFromSkillCommand(skillId, integrationId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);

    return this.skillDtoMapper.toDto(skill, context);
  }

  @Get(':skillId/mcp-integrations')
  @ApiOperation({ summary: 'List MCP integrations assigned to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all MCP integrations assigned to the skill',
    type: [McpIntegrationResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async listSkillMcpIntegrations(
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listSkillMcpIntegrations', { skillId });

    const integrations = await this.listSkillMcpIntegrationsUseCase.execute(
      new ListSkillMcpIntegrationsQuery(skillId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }
}
