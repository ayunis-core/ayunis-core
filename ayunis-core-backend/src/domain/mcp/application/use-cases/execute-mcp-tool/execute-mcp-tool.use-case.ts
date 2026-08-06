import { Injectable, Logger } from '@nestjs/common';
import { ExecuteMcpToolCommand } from './execute-mcp-tool.command';
import { McpToolCall } from '../../ports/mcp-client.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { isMcpConnectivityOutage, UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  isError: boolean;
  content: unknown; // Tool response content (structure depends on tool)
  errorMessage?: string; // Error message if execution failed
}

@Injectable()
export class ExecuteMcpToolUseCase {
  private readonly logger = new Logger(ExecuteMcpToolUseCase.name);

  constructor(
    private readonly mcpClientService: McpClientService,
    private readonly validateIntegrationAccess: ValidateIntegrationAccessService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: ExecuteMcpToolCommand): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    this.logger.log(
      `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=started`,
    );

    try {
      const integration = await this.validateIntegrationAccess.validate(
        command.integrationId,
      );

      // Execute tool (errors are caught and returned, not thrown)
      try {
        const userId = this.contextService.get('userId');
        const toolCall: McpToolCall = {
          toolName: command.toolName,
          parameters: command.parameters,
        };

        const result = await this.mcpClientService.callTool(
          integration,
          toolCall,
          userId,
        );

        const duration = Date.now() - startTime;
        this.logger.log(
          `[MCP] operation=execute_tool integration=${command.integrationId} name="${integration.name}" tool="${command.toolName}" status=${result.isError ? 'tool_error' : 'success'} duration=${duration}ms`,
        );

        return {
          isError: result.isError,
          content: result.content,
          ...(result.isError && { errorMessage: 'Tool execution failed' }),
        };
      } catch (toolError) {
        return this.toSoftFailureResult(
          toolError,
          command,
          integration.name,
          startTime,
        );
      }
    } catch (error) {
      this.rethrowExecutionError(error, command, startTime);
    }
  }

  private rethrowExecutionError(
    error: unknown,
    command: ExecuteMcpToolCommand,
    startTime: number,
  ): never {
    const duration = Date.now() - startTime;

    if (error instanceof ApplicationError) {
      this.logger.warn(
        `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=error error="${error.message}" duration=${duration}ms`,
      );
      throw error;
    }

    this.logger.error(
      `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=unexpected_error error="${(error as Error).message}" duration=${duration}ms`,
      { error: error as Error },
    );
    throw new UnexpectedMcpError(
      'Unexpected error occurred during tool execution',
    );
  }

  /**
   * Converts a thrown tool-call failure into the error result handed to the
   * LLM. This soft-return is the only place classified MCP outages surface
   * during a run, and their raw transport duplicates are suppressed
   * AppSignal-side (AYC-616) — so the classified failure must be reported
   * here or connection outages become invisible. Tool-level failures (bad
   * params, server-side tool bugs) stay unreported: they are the
   * integration's expected outcome, not ours.
   */
  private toSoftFailureResult(
    toolError: unknown,
    command: ExecuteMcpToolCommand,
    integrationName: string,
    startTime: number,
  ): ToolExecutionResult {
    const duration = Date.now() - startTime;
    const errorMsg = (toolError as Error).message || 'Tool execution failed';

    this.logger.warn(
      `[MCP] operation=execute_tool integration=${command.integrationId} name="${integrationName}" tool="${command.toolName}" status=error error="${errorMsg}" duration=${duration}ms`,
    );

    if (isMcpConnectivityOutage(toolError)) {
      reportUnexpectedError(toolError);
    }

    return {
      isError: true,
      content: null,
      errorMessage: errorMsg,
    };
  }
}
