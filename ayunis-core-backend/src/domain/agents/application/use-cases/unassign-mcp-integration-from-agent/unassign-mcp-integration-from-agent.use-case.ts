import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnassignMcpIntegrationFromAgentCommand } from './unassign-mcp-integration-from-agent.command';
import { Agent } from '../../../domain/agent.entity';
import {
  AgentNotFoundError,
  McpIntegrationNotAssignedError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UnassignMcpIntegrationFromAgentUseCase {
  private readonly logger = new Logger(
    UnassignMcpIntegrationFromAgentUseCase.name,
  );

  constructor(
    @Inject(AgentRepository)
    private readonly agentsRepository: AgentRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: UnassignMcpIntegrationFromAgentCommand,
  ): Promise<Agent> {
    this.logger.log('Unassigning MCP integration from agent', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate agent exists and user owns it
      const agent = await this.agentsRepository.findOne(
        command.agentId,
        userId,
      );
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      // Check integration is currently assigned
      if (!agent.mcpIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationNotAssignedError(command.integrationId);
      }

      // Update agent (remove integration ID)
      const updatedAgent = new Agent({
        ...agent,
        mcpIntegrationIds: agent.mcpIntegrationIds.filter(
          (id) => id !== command.integrationId,
        ),
      });

      return await this.agentsRepository.update(updatedAgent);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error unassigning MCP integration', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', {
        error: error as Error,
      });
    }
  }
}
