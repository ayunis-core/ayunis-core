import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

@Injectable()
export class RetrieveMcpResourceUseCase {
  private readonly logger = new Logger(RetrieveMcpResourceUseCase.name);

  constructor(
    private readonly mcpClientService: McpClientService,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(
    command: RetrieveMcpResourceCommand,
  ): Promise<{ content: unknown; mimeType: string }> {
    this.logger.log('retrieveMcpResource', {
      integrationId: command.integrationId,
      resourceUri: command.resourceUri,
      parameters: command.parameters,
    });

    const integration = await this.validateIntegrationAccess.validate(
      command.integrationId,
    );

    // Retrieve resource content with parameters (for URI template substitution)
    const userId = this.contextService.get('userId');
    const { content, mimeType } = await this.mcpClientService.readResource(
      integration,
      command.resourceUri,
      command.parameters,
      userId,
    );

    return { content, mimeType };
  }
}
