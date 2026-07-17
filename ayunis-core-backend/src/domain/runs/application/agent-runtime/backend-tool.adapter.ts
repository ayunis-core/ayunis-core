import type {
  JsonSchema,
  Tool as RuntimeTool,
  ToolExecutionContext as RuntimeToolContext,
} from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { ExecuteToolCommand } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.command';
import {
  CheckToolCapabilitiesUseCase,
  type ToolCapabilities,
} from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { CheckToolCapabilitiesQuery } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.query';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';

const MAX_TOOL_RESULT_LENGTH = 20000;
const DISPLAY_ACK = 'Tool has been displayed successfully';

/**
 * Adapts backend catalog tools to the runtime's `Tool` contract, mirroring the
 * legacy `ToolResultCollectorService` execution semantics:
 *
 * - executable tools run in-loop via `ExecuteToolUseCase`;
 * - hybrid (displayable + executable) tools run for their side effect but hand
 *   the model a display acknowledgement, not the raw result;
 * - display-only tools get no `execute`, so the runtime ends the loop and
 *   surfaces the call — the client renders it and continues with a tool-result
 *   input (handled by the orchestrator).
 *
 * PII redaction of tool output is applied by the anonymization hook, not here.
 */
@Injectable()
export class BackendToolAdapter {
  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
  ) {}

  toRuntimeTools(tools: BackendTool[]): RuntimeTool[] {
    return tools.map((tool) => this.toRuntimeTool(tool));
  }

  private toRuntimeTool(tool: BackendTool): RuntimeTool {
    const capabilities = this.checkToolCapabilitiesUseCase.execute(
      new CheckToolCapabilitiesQuery(tool),
    );
    const schema = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as unknown as JsonSchema,
    };
    if (!capabilities.isExecutable) {
      return schema;
    }
    return {
      ...schema,
      execute: (input, ctx) => this.execute(tool, input, ctx, capabilities),
    };
  }

  private async execute(
    tool: BackendTool,
    input: Record<string, unknown>,
    ctx: RuntimeToolContext,
    capabilities: ToolCapabilities,
  ): Promise<string> {
    const context = {
      orgId: ctx.context.get<UUID>('orgId')!,
      threadId: ctx.context.get<UUID>('threadId')!,
      isAnonymous: ctx.context.get<boolean>('isAnonymous') ?? false,
    };
    const result = await this.runTool(tool, input, context);
    if (capabilities.isDisplayable) {
      return DISPLAY_ACK;
    }
    return result.length > MAX_TOOL_RESULT_LENGTH ? truncate(result) : result;
  }

  private async runTool(
    tool: BackendTool,
    input: Record<string, unknown>,
    context: { orgId: UUID; threadId: UUID; isAnonymous: boolean },
  ): Promise<string> {
    try {
      return await this.executeToolUseCase.execute(
        new ExecuteToolCommand(tool, input, context),
      );
    } catch (error) {
      if (error instanceof ToolExecutionFailedError && error.exposeToLLM) {
        return `The tool didn't provide any result due to the following error in tool usage: ${error.message}`;
      }
      return `The tool didn't provide any result due to an unknown error`;
    }
  }
}

function truncate(result: string): string {
  return `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
}
