import { Injectable, Logger } from '@nestjs/common';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ValidateIntegrationAccessService } from 'src/domain/mcp/application/services/validate-integration-access.service';

@Injectable()
export class RetrieveMcpResourceUseCase {
  private readonly logger = new Logger(RetrieveMcpResourceUseCase.name);

  constructor(
    private readonly mcpClientService: McpClientService,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: RetrieveMcpResourceCommand,
  ): Promise<{ content: unknown; mimeType: string }> {
    this.logger.log(
      {
        integrationId: command.integrationId,
        url: command.resourceUri,
        input: command.parameters,
      },
      'retrieveMcpResource',
    );
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(
        {
          integrationId: command.integrationId,
          url: command.resourceUri,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'retrieveMcpResourceFailed',
      );
      throw new UnexpectedMcpError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
