import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EnableMcpIntegrationCommand } from './enable-mcp-integration.command';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class EnableMcpIntegrationUseCase {
  private readonly logger = new Logger(EnableMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: EnableMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('enableMcpIntegration', { id: command.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      integration.enable();

      return await this.repository.save(integration);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error enabling integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
