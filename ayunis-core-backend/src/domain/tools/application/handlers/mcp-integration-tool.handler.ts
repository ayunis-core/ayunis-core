import { McpRuntimeConnectionError } from 'src/domain/mcp/application/mcp-runtime-connection.error';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { Injectable, Logger } from '@nestjs/common';
import { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { ExecuteMcpToolCommand } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpFileHandoverService } from 'src/domain/tools/application/services/mcp-file-handover.service';

@Injectable()
export class McpIntegrationToolHandler implements ToolExecutionHandler {
  private readonly logger = new Logger(McpIntegrationToolHandler.name);

  constructor(
    private readonly executeMcpToolUseCase: ExecuteMcpToolUseCase,
    private readonly mcpFileHandoverService: McpFileHandoverService,
  ) {}

  async execute(params: {
    tool: McpIntegrationTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log({ name: tool.name, input: input }, 'execute');
    try {
      const validatedInput = tool.validateParams(input);
      // Signed download URLs live only in the arguments sent to the server;
      // `input` is what the run persists, streams and logs.
      const handover = await this.mcpFileHandoverService.handOver(
        tool,
        validatedInput,
        context,
      );
      const result = await this.executeMcpToolUseCase.execute(
        new ExecuteMcpToolCommand(
          tool.integrationId,
          tool.originalName,
          handover.arguments,
          context.signal,
        ),
      );
      if (result.connectionFailure)
        throw new McpRuntimeConnectionError(result.connectionFailure);
      return this.mcpFileHandoverService.redact(
        JSON.stringify(result.content),
        handover.files,
      );
    } catch (error) {
      context.signal?.throwIfAborted();
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error }, 'error');
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
