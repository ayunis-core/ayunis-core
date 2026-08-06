import type {
  JsonSchema,
  Tool as RuntimeTool,
  ToolExecutionContext as RuntimeToolContext,
  ToolExecutionResult as RuntimeToolResult,
} from '@ayunis/agent-runtime';
import { AgentRuntimeError } from '@ayunis/agent-runtime';
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
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import { THREAD_PII_MASKS_EVENT } from './masks-event';
import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import { serializeRuntimeModelError } from './runtime-model-error';

const MAX_TOOL_RESULT_LENGTH = 20000;
const DISPLAY_ACK = 'Tool has been displayed successfully';

interface ToolExecutionOutcome {
  result: string;
  succeeded: boolean;
}

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
 * In anonymous threads, PII-returning tool output is redacted at production and
 * the mask dictionary streamed via the run's `emit`, matching the legacy loop.
 */
@Injectable()
export class BackendToolAdapter {
  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
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
      // Display-only tools never reach a backend handler, so the runtime's
      // validateInput seam is the only pre-display check of their params; an
      // invalid call feeds the model an actionable error instead of ending
      // the turn with garbage params the client would render (AYC-675). The
      // message carries the same prefix the legacy collector and the
      // executable path use, so the model sees one error shape on both loops.
      return {
        ...schema,
        validateInput: (input: Record<string, unknown>): void => {
          try {
            tool.validateParams(stripDisallowedNulls(input, tool.parameters));
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Invalid parameters';
            throw new Error(
              `The tool didn't provide any result due to the following error in tool usage: ${message}`,
            );
          }
        },
      };
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
  ): Promise<RuntimeToolResult> {
    const context = {
      orgId: ctx.context.get<UUID>('orgId')!,
      threadId: ctx.context.get<UUID>('threadId')!,
      isAnonymous: ctx.context.get<boolean>('isAnonymous') ?? false,
    };
    const outcome = await this.runTool(tool, input, context);
    let result =
      outcome.result.length > MAX_TOOL_RESULT_LENGTH
        ? truncate(outcome.result)
        : outcome.result;
    if (context.isAnonymous && tool.returnsPii) {
      result = await this.redact(result, context, ctx);
    }
    return {
      result:
        capabilities.isDisplayable && outcome.succeeded ? DISPLAY_ACK : result,
      isError: !outcome.succeeded,
    };
  }

  private async redact(
    result: string,
    context: { orgId: UUID; threadId: UUID },
    ctx: RuntimeToolContext,
  ): Promise<string> {
    const anonymized = await this.anonymizeTextForThreadUseCase
      .execute(
        new AnonymizeTextForThreadCommand(
          result,
          context.orgId,
          context.threadId,
        ),
      )
      .catch((error: unknown) => {
        // A classified provider failure must survive the runtime round-trip
        // in `details` — `cause` is process-local and the event stream only
        // serializes details — so mapRunError can rebuild it and AppSignal
        // groups under PROVIDER_UNAVAILABLE_*_ANONYMIZE (AYC-654).
        throw new AgentRuntimeError(
          'ANONYMIZATION_UNAVAILABLE',
          'Anonymization is currently unavailable',
          {
            cause: error,
            ...(error instanceof ProviderUnavailableError && {
              details: serializeRuntimeModelError(
                error,
                STREAM_IDLE_TIMEOUT_MS,
              ),
            }),
          },
        );
      });
    ctx.emit({ name: THREAD_PII_MASKS_EVENT, data: anonymized.masks });
    return anonymized.anonymizedText;
  }

  private async runTool(
    tool: BackendTool,
    input: Record<string, unknown>,
    context: { orgId: UUID; threadId: UUID; isAnonymous: boolean },
  ): Promise<ToolExecutionOutcome> {
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
}

function truncate(result: string): string {
  return `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
}
