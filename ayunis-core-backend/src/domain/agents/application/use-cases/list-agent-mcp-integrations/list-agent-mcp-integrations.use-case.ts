import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ListAgentMcpIntegrationsQuery } from './list-agent-mcp-integrations.query';
import { AgentRepository } from '../../ports/agent.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Use case for listing all MCP integrations assigned to an agent.
 * Returns full integration entities (not just IDs) for UI display.
 */
@Injectable()
export class ListAgentMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListAgentMcpIntegrationsUseCase.name);

  constructor(
    @Inject(AgentRepository)
    private readonly agentsRepository: AgentRepository,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to list all MCP integrations for an agent.
   * @param query Query containing the agent ID
   * @returns Array of McpIntegration entities (empty array if none assigned)
   * @throws UnauthorizedException if user not authenticated
   * @throws AgentNotFoundError if agent doesn't exist or user doesn't own it
   * @throws UnexpectedAgentError for unexpected errors
   */
  async execute(
    query: ListAgentMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log('Listing MCP integrations for agent', {
      agentId: query.agentId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate agent exists and user owns it
      const agent = await this.agentsRepository.findOne(query.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(query.agentId);
      }

      // If no integrations assigned, return empty array
      if (agent.mcpIntegrationIds.length === 0) {
        return [];
      }

      // Fetch full integration entities for all IDs
      const integrations = await Promise.all(
        agent.mcpIntegrationIds.map((id) =>
          this.mcpIntegrationsRepository.findById(id),
        ),
      );

      // Filter out nulls (in case integrations were deleted)
      return integrations.filter(
        (integration): integration is McpIntegration => integration !== null,
      );
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error listing agent MCP integrations', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', {
        error: error as Error,
      });
    }
  }
}
