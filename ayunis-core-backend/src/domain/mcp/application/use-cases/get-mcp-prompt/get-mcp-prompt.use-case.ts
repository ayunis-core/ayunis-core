import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetMcpPromptQuery } from './get-mcp-prompt.query';
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

export interface PromptMessage {
  role: string;
  content: string;
}

export interface PromptResult {
  messages: PromptMessage[];
  description?: string;
}

interface McpPromptMessage {
  role: string;
  content: string | { text?: string; [key: string]: unknown };
}

interface McpPromptResponse {
  messages: McpPromptMessage[];
  description?: string;
}

@Injectable()
export class GetMcpPromptUseCase {
  private readonly logger = new Logger(GetMcpPromptUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetMcpPromptQuery): Promise<PromptResult> {
    this.logger.log('getMcpPrompt', {
      id: query.integrationId,
      prompt: query.promptName,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(query.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(query.integrationId);
      }

      if (integration.orgId !== orgId) {
        throw new McpIntegrationAccessDeniedError(query.integrationId);
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(query.integrationId);
      }

      // Retrieve prompt from MCP server
      const promptResponse = await this.mcpClientService.getPrompt(
        integration,
        query.promptName,
        query.args || {},
      );

      this.logger.log('promptRetrieved', {
        id: query.integrationId,
        prompt: query.promptName,
        messageCount: promptResponse.messages.length,
      });

      // Map to PromptResult
      const response = promptResponse as McpPromptResponse;
      return {
        messages: response.messages.map((msg) => ({
          role: msg.role,
          content:
            typeof msg.content === 'string'
              ? msg.content
              : (msg.content.text ?? JSON.stringify(msg.content)),
        })),
        description: response.description,
      };
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error getting prompt', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
