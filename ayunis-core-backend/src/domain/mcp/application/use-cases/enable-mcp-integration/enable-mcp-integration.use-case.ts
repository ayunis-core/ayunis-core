import { Injectable, Logger } from '@nestjs/common';
import { EnableMcpIntegrationCommand } from './enable-mcp-integration.command';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

@Injectable()
export class EnableMcpIntegrationUseCase {
  private readonly logger = new Logger(EnableMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
  ) {}

  async execute(command: EnableMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('enableMcpIntegration', { id: command.integrationId });

    try {
      const integration = await this.validateIntegrationAccess.validate(
        command.integrationId,
        { requireEnabled: false },
      );

      integration.enable();

      return await this.repository.save(integration);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error enabling integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
