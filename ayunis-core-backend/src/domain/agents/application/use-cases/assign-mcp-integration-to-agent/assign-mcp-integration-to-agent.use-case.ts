import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AssignMcpIntegrationToAgentCommand } from './assign-mcp-integration-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { GetMcpIntegrationUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { GetMcpIntegrationQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.query';
import { ContextService } from 'src/common/context/services/context.service';
import { Agent } from '../../../domain/agent.entity';
import {
  AgentNotFoundError,
  McpIntegrationNotFoundError,
  McpIntegrationAlreadyAssignedError,
  McpIntegrationDisabledError,
  McpIntegrationWrongOrganizationError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class AssignMcpIntegrationToAgentUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToAgentUseCase.name);

  constructor(
    @Inject(AgentRepository)
    private readonly agentsRepository: AgentRepository,
    private readonly getMcpIntegrationUseCase: GetMcpIntegrationUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: AssignMcpIntegrationToAgentCommand): Promise<Agent> {
    this.logger.log('Assigning MCP integration to agent', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const agent = await this.agentsRepository.findOne(
        command.agentId,
        userId,
      );
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      let integration;
      try {
        integration = await this.getMcpIntegrationUseCase.execute(
          new GetMcpIntegrationQuery(command.integrationId),
        );
      } catch {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      if (integration.orgId !== orgId) {
        throw new McpIntegrationWrongOrganizationError(command.integrationId);
      }

      if (agent.mcpIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationAlreadyAssignedError(command.integrationId);
      }

      const updatedAgent = new Agent({
        id: agent.id,
        name: agent.name,
        instructions: agent.instructions,
        model: agent.model,
        userId: agent.userId,
        toolAssignments: agent.toolAssignments,
        sourceAssignments: agent.sourceAssignments,
        mcpIntegrationIds: [...agent.mcpIntegrationIds, command.integrationId],
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      });

      return await this.agentsRepository.update(updatedAgent);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error assigning MCP integration', {
        error: error as Error,
      });
      throw new UnexpectedAgentError(error);
    }
  }
}
