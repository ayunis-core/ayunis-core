import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { EnableMcpIntegrationCommand } from './enable-mcp-integration.command';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

@Injectable()
export class EnableMcpIntegrationUseCase {
  private readonly logger = new Logger(EnableMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: EnableMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('enableMcpIntegration', { id: command.integrationId });

    const integration = await this.validateIntegrationAccess.validate(
      command.integrationId,
      { requireEnabled: false },
    );

    integration.enable();

    return await this.repository.save(integration);
  }
}
