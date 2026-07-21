import type {
  JsonSchema,
  Tool as RuntimeTool,
  ToolExecutionContext as RuntimeToolContext,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { ToolUsedEvent } from '../events/tool-used.event';

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
  private readonly logger = new Logger(BackendToolAdapter.name);

  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
    private readonly eventEmitter: EventEmitter2,
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
    const orgId = ctx.context.get<UUID>('orgId')!;
    const userId = ctx.context.get<UUID>('userId');
    const context = {
      orgId,
      threadId: ctx.context.get<UUID>('threadId')!,
      isAnonymous: ctx.context.get<boolean>('isAnonymous') ?? false,
    };
    this.emitToolUsed(userId, orgId, tool.name);
    const { result, succeeded } = await this.runTool(tool, input, context);
    // Hybrid tools swap in the display acknowledgement only when the side
    // effect succeeded; a failed execution still surfaces its error to the
    // model (mirrors `ToolResultCollectorService.processHybridTool`).
    if (capabilities.isDisplayable && succeeded) {
      return DISPLAY_ACK;
    }
    return result.length > MAX_TOOL_RESULT_LENGTH ? truncate(result) : result;
  }

  private async runTool(
    tool: BackendTool,
    input: Record<string, unknown>,
    context: { orgId: UUID; threadId: UUID; isAnonymous: boolean },
  ): Promise<{ result: string; succeeded: boolean }> {
    try {
      const result = await this.executeToolUseCase.execute(
        new ExecuteToolCommand(tool, input, context),
      );
      return { result, succeeded: true };
    } catch (error) {
      if (error instanceof ToolExecutionFailedError && error.exposeToLLM) {
        return {
          result: `The tool didn't provide any result due to the following error in tool usage: ${error.message}`,
          succeeded: false,
        };
      }
      return {
        result: `The tool didn't provide any result due to an unknown error`,
        succeeded: false,
      };
    }
  }

  private emitToolUsed(
    userId: UUID | undefined,
    orgId: UUID,
    toolName: string,
  ): void {
    this.eventEmitter
      .emitAsync(
        ToolUsedEvent.EVENT_NAME,
        new ToolUsedEvent(userId ?? ('unknown' as UUID), orgId, toolName),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit ToolUsedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          toolName,
        });
      });
  }
}

function truncate(result: string): string {
  return `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
}
