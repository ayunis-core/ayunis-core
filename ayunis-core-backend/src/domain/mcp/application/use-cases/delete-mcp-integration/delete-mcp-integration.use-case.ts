import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DeleteMcpIntegrationCommand } from './delete-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpCapabilityCacheService } from '../../services/mcp-capability-cache.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { McpClientService } from '../../services/mcp-client.service';

/**
 * Use case for deleting an MCP integration.
 */
@Injectable()
export class DeleteMcpIntegrationUseCase {
  constructor(
    @InjectPinoLogger(DeleteMcpIntegrationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
    private readonly capabilityCache: McpCapabilityCacheService,
    private readonly mcpClientService: McpClientService,
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
    this.logger.info({ id: command.integrationId }, 'deleteMcpIntegration');

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

    await this.mcpClientService.invalidateConnections(integration);
    this.capabilityCache.invalidate(command.integrationId);
  }
}
