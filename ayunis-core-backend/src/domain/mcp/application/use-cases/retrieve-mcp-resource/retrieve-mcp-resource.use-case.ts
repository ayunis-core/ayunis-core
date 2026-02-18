import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class RetrieveMcpResourceUseCase {
  private readonly logger = new Logger(RetrieveMcpResourceUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
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
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(
        command.integrationId as UUID,
      );
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.orgId !== orgId) {
        throw new McpIntegrationAccessDeniedError(
          command.integrationId,
          integration.name,
        );
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(
          command.integrationId,
          integration.name,
        );
      }

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
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
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
