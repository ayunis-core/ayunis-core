import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteMcpIntegrationCommand } from './delete-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';

/**
 * Use case for deleting an MCP integration.
 */
@Injectable()
export class DeleteMcpIntegrationUseCase {
  private readonly logger = new Logger(DeleteMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Deletes an MCP integration.
   * @param command The delete command
   * @throws McpIntegrationNotFoundError if integration doesn't exist
   * @throws McpIntegrationAccessDeniedError if integration belongs to different org
   * @throws UnauthorizedException if user not authenticated
   */
  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: DeleteMcpIntegrationCommand): Promise<void> {
    this.logger.log('deleteMcpIntegration', { id: command.integrationId });

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
    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(command.integrationId);
    }

    // Delete associated user configs before deleting the integration
    await this.userConfigRepository.deleteByIntegrationId(
      command.integrationId,
    );

    // Delete integration
    await this.repository.delete(command.integrationId);
  }
}
