import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DisableMcpIntegrationCommand } from './disable-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DisableMcpIntegrationUseCase {
  private readonly logger = new Logger(DisableMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: DisableMcpIntegrationCommand,
  ): Promise<McpIntegration> {
    this.logger.log('disableMcpIntegration', { id: command.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      // Verify organization access
      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      // Disable the integration (domain entity method)
      integration.disable();

      // Save and return the updated integration
      return await this.repository.save(integration);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error disabling integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
