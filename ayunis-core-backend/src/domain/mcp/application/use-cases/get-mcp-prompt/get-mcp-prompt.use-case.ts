import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';

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
  constructor(
    @InjectPinoLogger(GetMcpPromptUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetMcpPromptQuery): Promise<PromptResult> {
    this.logger.info(
      { id: query.integrationId, prompt: query.promptName },
      'getMcpPrompt',
    );

    try {
      const integration = await this.getAccessibleIntegration(query);
      const promptResponse = await this.mcpClientService.getPrompt(
        integration,
        query.promptName,
        query.args ?? {},
        this.contextService.get('userId'),
      );
      this.logger.info(
        {
          id: query.integrationId,
          prompt: query.promptName,
          messageCount: promptResponse.messages.length,
        },
        'promptRetrieved',
      );
      return this.mapPromptResponse(promptResponse as McpPromptResponse);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        { err: error as Error },
        'Unexpected error getting prompt',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async getAccessibleIntegration(
    query: GetMcpPromptQuery,
  ): Promise<McpIntegration> {
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
    return integration;
  }

  private mapPromptResponse(response: McpPromptResponse): PromptResult {
    return {
      messages: response.messages.map((message) => ({
        role: message.role,
        content:
          typeof message.content === 'string'
            ? message.content
            : (message.content.text ?? JSON.stringify(message.content)),
      })),
      description: response.description,
    };
  }
}
