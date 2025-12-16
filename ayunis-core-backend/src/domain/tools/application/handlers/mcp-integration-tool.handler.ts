import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { Injectable, Logger } from '@nestjs/common';
import { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import { McpIntegrationTool } from '../../domain/tools/mcp-integration-tool.entity';
import { ExecuteMcpToolCommand } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command';
import { ToolExecutionFailedError } from '../tools.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class McpIntegrationToolHandler implements ToolExecutionHandler {
  private readonly logger = new Logger(McpIntegrationToolHandler.name);

  constructor(private readonly executeMcpToolUseCase: ExecuteMcpToolUseCase) {}

  async execute(params: {
    tool: McpIntegrationTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input) as Record<
        string,
        unknown
      >;
      const result = await this.executeMcpToolUseCase.execute(
        new ExecuteMcpToolCommand(
          tool.integrationId,
          tool.name,
          validatedInput,
        ),
      );
      return JSON.stringify(result.content);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('error', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred while executing MCP tool',
        exposeToLLM: true,
      });
    }
  }
}
