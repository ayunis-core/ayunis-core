import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ListAvailableMcpIntegrationsQuery } from './list-available-mcp-integrations.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAgentError } from '../../agents.errors';

/**
 * Use case for listing all available (enabled) MCP integrations for the user's organization.
 * This allows users to see which integrations they can potentially assign to their agents.
 */
@Injectable()
export class ListAvailableMcpIntegrationsUseCase {
  private readonly logger = new Logger(
    ListAvailableMcpIntegrationsUseCase.name,
  );

  constructor(
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to retrieve all enabled MCP integrations for the user's organization.
   *
   * @param query - Contains agentId (for API consistency, not used in logic)
   * @returns Array of enabled MCP integrations for the organization
   * @throws UnauthorizedException if user is not authenticated (no orgId in context)
   * @throws UnexpectedAgentError if an unexpected error occurs
   */
  async execute(
    query: ListAvailableMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log('Listing available MCP integrations for organization');

    try {
      // Get organization context
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Retrieve all enabled integrations for the organization
      const integrations =
        await this.mcpIntegrationsRepository.findByOrganizationIdAndEnabled(
          orgId,
        );

      return integrations;
    } catch (error) {
      // Re-throw application errors and auth errors as-is
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Wrap unexpected errors
      this.logger.error('Unexpected error listing available MCP integrations', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', {
        error: error as Error,
      });
    }
  }
}
