import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DeleteMcpIntegrationCommand } from './delete-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Use case for deleting an MCP integration.
 */
@Injectable()
export class DeleteMcpIntegrationUseCase {
  private readonly logger = new Logger(DeleteMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Deletes an MCP integration.
   * @param command The delete command
   * @throws McpIntegrationNotFoundError if integration doesn't exist
   * @throws McpIntegrationAccessDeniedError if integration belongs to different org
   * @throws UnauthorizedException if user not authenticated
   */
  async execute(command: DeleteMcpIntegrationCommand): Promise<void> {
    this.logger.log('deleteMcpIntegration', { id: command.integrationId });

    try {
      // Get organization ID from context
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Fetch existing integration
      const integration = await this.repository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      // Verify access
      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      // Delete integration
      await this.repository.delete(command.integrationId);
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error deleting integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
