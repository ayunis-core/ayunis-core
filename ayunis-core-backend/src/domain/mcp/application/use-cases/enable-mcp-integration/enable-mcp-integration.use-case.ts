import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EnableMcpIntegrationCommand } from './enable-mcp-integration.command';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

@Injectable()
export class EnableMcpIntegrationUseCase {
  constructor(
    @InjectPinoLogger(EnableMcpIntegrationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
  ) {}

  async execute(command: EnableMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.info({ id: command.integrationId }, 'enableMcpIntegration');

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error enabling integration',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
