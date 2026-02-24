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

import { AssignMcpIntegrationToAgentUseCase } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case';
import { AssignMcpIntegrationToAgentCommand } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.command';
import { UnassignMcpIntegrationFromAgentUseCase } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case';
import { UnassignMcpIntegrationFromAgentCommand } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.command';
import { ListAgentMcpIntegrationsUseCase } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case';
import { ListAgentMcpIntegrationsQuery } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.query';

import { AgentResponseDto } from './dto/agent-response.dto';
import { AgentDtoMapper } from './mappers/agent.mapper';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('agents')
@RequireFeature(FeatureFlag.Agents)
@Controller('agents')
export class AgentMcpIntegrationsController {
  private readonly logger = new Logger(AgentMcpIntegrationsController.name);

  constructor(
    private readonly assignMcpIntegrationToAgentUseCase: AssignMcpIntegrationToAgentUseCase,
    private readonly unassignMcpIntegrationFromAgentUseCase: UnassignMcpIntegrationFromAgentUseCase,
    private readonly listAgentMcpIntegrationsUseCase: ListAgentMcpIntegrationsUseCase,
    private readonly agentDtoMapper: AgentDtoMapper,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
  ) {}

  @Post(':agentId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Assign MCP integration to agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
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
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Integration disabled',
  })
  @ApiResponse({
    status: 403,
    description: 'Integration belongs to different organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent or integration not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Integration already assigned',
  })
  @HttpCode(HttpStatus.CREATED)
  async assignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('assignMcpIntegration', { agentId, integrationId });

    const agent = await this.assignMcpIntegrationToAgentUseCase.execute(
      new AssignMcpIntegrationToAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Delete(':agentId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Unassign MCP integration from agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
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
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found or integration not assigned',
  })
  async unassignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('unassignMcpIntegration', { agentId, integrationId });

    const agent = await this.unassignMcpIntegrationFromAgentUseCase.execute(
      new UnassignMcpIntegrationFromAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Get(':agentId/mcp-integrations')
  @ApiOperation({ summary: 'List MCP integrations assigned to agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all MCP integrations assigned to the agent',
    type: [McpIntegrationResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async listAgentMcpIntegrations(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listAgentMcpIntegrations', { agentId });

    const integrations = await this.listAgentMcpIntegrationsUseCase.execute(
      new ListAgentMcpIntegrationsQuery(agentId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }
}
