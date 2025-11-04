import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AssignMcpIntegrationToAgentCommand } from './assign-mcp-integration-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
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

/**
 * Use case for assigning an MCP integration to an agent.
 * Validates that the user owns the agent, the integration exists and is enabled,
 * belongs to the same organization, and is not already assigned.
 */
@Injectable()
export class AssignMcpIntegrationToAgentUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToAgentUseCase.name);

  constructor(
    @Inject(AgentRepository)
    private readonly agentsRepository: AgentRepository,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to assign an MCP integration to an agent.
   * @param command The command containing agentId and integrationId
   * @returns The updated agent with the integration assigned
   * @throws UnauthorizedException if user is not authenticated
   * @throws AgentNotFoundError if agent doesn't exist or user doesn't own it
   * @throws McpIntegrationNotFoundError if integration doesn't exist
   * @throws McpIntegrationDisabledError if integration is disabled
   * @throws McpIntegrationWrongOrganizationError if integration belongs to different org
   * @throws McpIntegrationAlreadyAssignedError if integration is already assigned
   * @throws UnexpectedAgentError for unexpected errors
   */
  async execute(command: AssignMcpIntegrationToAgentCommand): Promise<Agent> {
    this.logger.log('Assigning MCP integration to agent', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
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

      // Validate integration exists
      const integration = await this.mcpIntegrationsRepository.findById(
        command.integrationId,
      );
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      // Validate integration is enabled
      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      // Validate integration belongs to same org
      if (integration.orgId !== orgId) {
        throw new McpIntegrationWrongOrganizationError(command.integrationId);
      }

      // Check not already assigned
      if (agent.mcpIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationAlreadyAssignedError(command.integrationId);
      }

      // Update agent by adding integration ID to array
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
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error assigning MCP integration', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', {
        error: error as Error,
      });
    }
  }
}
