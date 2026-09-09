import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AssignMcpIntegrationToSkillUseCase } from 'src/domain/skills/application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.use-case';
import { UnassignMcpIntegrationFromSkillUseCase } from 'src/domain/skills/application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.use-case';
import { ListSkillMcpIntegrationsUseCase } from 'src/domain/skills/application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.use-case';

import { AssignMcpIntegrationToSkillCommand } from 'src/domain/skills/application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.command';
import { UnassignMcpIntegrationFromSkillCommand } from 'src/domain/skills/application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.command';
import { ListSkillMcpIntegrationsQuery } from 'src/domain/skills/application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.query';

import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';

import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

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
    private readonly findOneSkill: FindOneSkillUseCase,
  ) {}

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log({ skillId, integrationId }, 'assignMcpIntegration');

    await this.assignMcpIntegrationToSkillUseCase.execute(
      new AssignMcpIntegrationToSkillCommand(skillId, integrationId),
    );
    return this.findSkillDto(skillId);
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log({ skillId, integrationId }, 'unassignMcpIntegration');

    await this.unassignMcpIntegrationFromSkillUseCase.execute(
      new UnassignMcpIntegrationFromSkillCommand(skillId, integrationId),
    );
    return this.findSkillDto(skillId);
  }

  private async findSkillDto(skillId: UUID): Promise<SkillResponseDto> {
    const context = await this.findOneSkill.execute(
      new FindOneSkillQuery(skillId),
    );
    return this.skillDtoMapper.toDto(
      context.skill,
      context,
      context.creatorName,
    );
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
    this.logger.log({ skillId }, 'listSkillMcpIntegrations');

    const integrations = await this.listSkillMcpIntegrationsUseCase.execute(
      new ListSkillMcpIntegrationsQuery(skillId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }
}
