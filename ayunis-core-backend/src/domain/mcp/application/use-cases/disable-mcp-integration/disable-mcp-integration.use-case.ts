import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DisableMcpIntegrationCommand } from './disable-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DisableMcpIntegrationUseCase {
  constructor(
    @InjectPinoLogger(DisableMcpIntegrationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: DisableMcpIntegrationCommand,
  ): Promise<McpIntegration> {
    this.logger.info({ id: command.integrationId }, 'disableMcpIntegration');

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
      if (integration.orgId !== orgId) {
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
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error disabling integration',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
