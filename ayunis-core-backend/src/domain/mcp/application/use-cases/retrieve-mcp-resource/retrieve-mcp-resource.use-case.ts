import { Injectable, Logger } from '@nestjs/common';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

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
    this.logger.log('retrieveMcpResource', {
      integrationId: command.integrationId,
      resourceUri: command.resourceUri,
      parameters: command.parameters,
    });
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

      this.logger.error('retrieveMcpResourceFailed', {
        integrationId: command.integrationId,
        resourceUri: command.resourceUri,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedMcpError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
