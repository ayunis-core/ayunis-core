import { RetrieveMcpResourceUseCase } from 'src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case';
import { McpIntegrationResource } from '../../domain/tools/mcp-integration-resource.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { RetrieveMcpResourceCommand } from 'src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.command';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ToolExecutionFailedError } from '../tools.errors';

@Injectable()
export class McpIntegrationResourceHandler implements ToolExecutionHandler {
  private readonly logger = new Logger(McpIntegrationResourceHandler.name);

  constructor(
    private readonly retrieveMcpResourceUseCase: RetrieveMcpResourceUseCase,
  ) {}

  async execute(params: {
    tool: McpIntegrationResource;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', tool, input);
    const validatedInput = tool.validateParams(input);
    try {
      await this.retrieveMcpResourceUseCase.execute(
        new RetrieveMcpResourceCommand(
          tool.integrationId,
          validatedInput.resourceUri,
        ),
      );
      // TODO: Return the content of the resource
      // If it is a csv, add as data source
      return JSON.stringify(validatedInput);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('error', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred while retrieving MCP resource',
        exposeToLLM: true,
      });
    }
  }
}
