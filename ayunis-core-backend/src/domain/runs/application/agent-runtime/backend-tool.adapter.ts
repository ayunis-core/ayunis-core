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
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import { RunAnonymizationUnavailableError } from '../runs.errors';
import { THREAD_PII_MASKS_EVENT } from './masks-event';

const MAX_TOOL_RESULT_LENGTH = 20000;
const DISPLAY_ACK = 'Tool has been displayed successfully';

/**
 * RunContext key set when tool-output anonymization fails. The runtime swallows
 * a tool's thrown error into a soft error result, so the adapter flags the run
 * here instead; the anonymization guard hook aborts the loop and the use case
 * surfaces `RunAnonymizationUnavailableError` (fail-closed, matching the legacy
 * `ToolResultCollectorService`).
 */
export const ANONYMIZATION_UNAVAILABLE = Symbol(
  'ayunis:anonymizationUnavailable',
);

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
    let result = await this.runTool(tool, input, context);
    if (result.length > MAX_TOOL_RESULT_LENGTH) {
      result = truncate(result);
    }
    if (context.isAnonymous && tool.returnsPii) {
      result = await this.redact(result, context, ctx);
    }
    return capabilities.isDisplayable ? DISPLAY_ACK : result;
  }

  /** Redacts PII from tool output and streams the mask dictionary. */
  private async redact(
    result: string,
    context: { orgId: UUID; threadId: UUID },
    ctx: RuntimeToolContext,
  ): Promise<string> {
    let anonymized: Awaited<
      ReturnType<AnonymizeTextForThreadUseCase['execute']>
    >;
    try {
      anonymized = await this.anonymizeTextForThreadUseCase.execute(
        new AnonymizeTextForThreadCommand(
          result,
          context.orgId,
          context.threadId,
        ),
      );
    } catch (error) {
      // Fail closed: never hand the model un-anonymized PII. The runtime turns
      // a thrown tool error into a soft error result, so flag the run for the
      // guard hook (which aborts the loop) and the use case (which surfaces
      // RunAnonymizationUnavailableError) instead of relying on this throw.
      ctx.context.set(ANONYMIZATION_UNAVAILABLE, true);
      throw new RunAnonymizationUnavailableError({
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    ctx.emit({ name: THREAD_PII_MASKS_EVENT, data: anonymized.masks });
    return anonymized.anonymizedText;
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
