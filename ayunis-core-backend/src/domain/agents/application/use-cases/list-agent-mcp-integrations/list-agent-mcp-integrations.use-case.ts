import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ListAgentMcpIntegrationsQuery } from './list-agent-mcp-integrations.query';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { Agent } from '../../../domain/agent.entity';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';

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
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly contextService: ContextService,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
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

      // Find agent (owned or shared)
      const agent = await this.findAgentOwnedOrShared(query.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(query.agentId);
      }

      // If no integrations assigned, return empty array
      if (agent.mcpIntegrationIds.length === 0) {
        return [];
      }

      // Fetch full integration entities for all IDs
      return this.getMcpIntegrationsByIdsUseCase.execute(
        new GetMcpIntegrationsByIdsQuery(agent.mcpIntegrationIds),
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
      throw new UnexpectedAgentError(error);
    }
  }

  /**
   * Finds an agent that is either owned by the user or shared with their organization.
   */
  private async findAgentOwnedOrShared(
    agentId: UUID,
    userId: UUID,
  ): Promise<Agent | null> {
    // 1. Try to find owned agent first
    const ownedAgent = await this.agentsRepository.findOne(agentId, userId);
    if (ownedAgent) {
      return ownedAgent;
    }

    // 2. Check if agent is shared with user's org
    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.AGENT, agentId),
    );

    if (share) {
      // 3. Fetch the shared agent by ID (no user filter)
      return this.agentsRepository.findById(agentId);
    }

    return null;
  }
}
