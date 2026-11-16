import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  McpUnauthenticatedError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import { ValidateIntegrationAccessService } from 'src/domain/mcp/application/services/validate-integration-access.service';
import { DeleteUserMcpConfigCommand } from './delete-user-mcp-config.command';

@Injectable()
export class DeleteUserMcpConfigUseCase {
  private readonly logger = new Logger(DeleteUserMcpConfigUseCase.name);

  constructor(
    private readonly context: ContextService,
    private readonly access: ValidateIntegrationAccessService,
    private readonly configs: McpIntegrationUserConfigRepositoryPort,
    private readonly client: McpClientService,
    private readonly cache: McpCapabilityCacheService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: DeleteUserMcpConfigCommand): Promise<void> {
    this.logger.log({ integrationId: command.integrationId }, 'execute');
    const userId = this.context.get('userId');
    if (!userId) throw new McpUnauthenticatedError();
    const integration = await this.access.validate(command.integrationId, {
      requireEnabled: false,
    });
    await this.configs.deleteByIntegrationAndUser(integration.id, userId);
    await this.client.invalidateConnections(integration, userId);
    this.cache.invalidate(integration.id, userId);
  }
}
