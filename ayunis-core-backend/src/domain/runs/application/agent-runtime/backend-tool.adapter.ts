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
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import { THREAD_PII_MASKS_EVENT } from './masks-event';
import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import {
  addToolResultTruncationNotice,
  truncateToolResult,
} from 'src/domain/runs/application/helpers/limit-tool-result.helper';
import { MAX_ANONYMIZATION_TEXT_LENGTH } from 'src/common/anonymization/application/anonymization.constants';
import { serializeRuntimeModelError } from './runtime-model-error';
import {
  isAcknowledgementOnlyTool,
  isExternallyHandledTool,
  isHybridArtifactTool,
  requiresUserApproval,
} from './runtime-tool-policy';
import {
  ToolApprovalBrokerService,
  type ToolApprovalOutcome,
} from 'src/domain/runs/application/services/tool-approval-broker.service';
import {
  recordDeclinedToolCall,
  TOOL_CALL_DECLINED_EVENT,
} from './tool-call-outcomes';

const DISPLAY_ACK = 'Tool has been displayed successfully';
const USER_DECLINED =
  'The user declined this tool call, so it was not executed. Do not retry it unless the user asks you to.';
const APPROVAL_TIMED_OUT =
  'The user did not approve this tool call in time, so it was not executed. Ask the user whether to try again.';

interface ToolExecutionOutcome {
  result: string;
  succeeded: boolean;
}

/**
 * Adapts backend catalog tools to the runtime's optional-execute contract.
 * Backend and hybrid tools delegate through `ExecuteToolUseCase`, charts and
 * maps acknowledge without side effects, and externally handled widgets omit
 * `execute` so the current run terminates after their tool phase.
 *
 * In anonymous threads, PII-returning tool output is redacted before the mask
 * dictionary and result are streamed to the client.
 */
@Injectable()
export class BackendToolAdapter {
  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly approvalBroker: ToolApprovalBrokerService,
  ) {}

  toRuntimeTools(tools: BackendTool[]): RuntimeTool[] {
    return tools.map((tool) => this.toRuntimeTool(tool));
  }

  private toRuntimeTool(tool: BackendTool): RuntimeTool {
    const schema = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as unknown as JsonSchema,
    };
    if (isAcknowledgementOnlyTool(tool)) {
      return {
        ...schema,
        validateInput: this.buildInputValidator(tool),
        execute: () => ({ result: DISPLAY_ACK, isError: false }),
      };
    }
    if (isExternallyHandledTool(tool)) {
      return { ...schema, validateInput: this.buildInputValidator(tool) };
    }
    if (requiresUserApproval(tool)) {
      // Validated before the user is asked, so nobody approves a call that
      // would fail on its input anyway.
      return {
        ...schema,
        validateInput: this.buildInputValidator(tool),
        execute: (input, ctx) => this.executeWithApproval(tool, input, ctx),
      };
    }
    return {
      ...schema,
      execute: (input, ctx) =>
        this.execute(tool, input, ctx, isHybridArtifactTool(tool)),
    };
  }

  private buildInputValidator(
    tool: BackendTool,
  ): (input: Record<string, unknown>) => void {
    return (input): void => {
      try {
        tool.validateParams(stripDisallowedNulls(input, tool.parameters));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid parameters';
        throw new Error(
          `The tool didn't provide any result due to the following error in tool usage: ${message}`,
        );
      }
    };
  }

  private async executeWithApproval(
    tool: BackendTool,
    input: Record<string, unknown>,
    ctx: RuntimeToolContext,
  ): Promise<RuntimeToolResult> {
    const outcome = await this.approvalBroker.awaitDecision({
      threadId: ctx.context.get<UUID>('threadId')!,
      toolCallId: ctx.toolCallId,
      userId: ctx.context.get<UUID>('userId')!,
      signal: ctx.signal,
    });
    if (outcome === 'approved') {
      return this.execute(tool, input, ctx, false);
    }
    recordDeclinedToolCall(ctx.context, ctx.toolCallId);
    ctx.emit({
      name: TOOL_CALL_DECLINED_EVENT,
      data: { toolCallId: ctx.toolCallId },
    });
    // Not an error: the model should move on, not treat the tool as broken.
    return { result: declinedResultText(outcome), isError: false };
  }

  private async execute(
    tool: BackendTool,
    input: Record<string, unknown>,
    ctx: RuntimeToolContext,
    returnDisplayAcknowledgement: boolean,
  ): Promise<RuntimeToolResult> {
    const context = {
      orgId: ctx.context.get<UUID>('orgId')!,
      threadId: ctx.context.get<UUID>('threadId')!,
      isAnonymous: ctx.context.get<boolean>('isAnonymous') ?? false,
    };
    const outcome = await this.runTool(tool, input, context);
    let result = outcome.result;
    if (context.isAnonymous && tool.returnsPii) {
      const limited = truncateToolResult(result, MAX_ANONYMIZATION_TEXT_LENGTH);
      result = await this.redact(limited.result, context, ctx);
      if (limited.truncated) {
        result = addToolResultTruncationNotice(result);
      }
    }
    return {
      result:
        returnDisplayAcknowledgement && outcome.succeeded
          ? DISPLAY_ACK
          : result,
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

function declinedResultText(
  outcome: Exclude<ToolApprovalOutcome, 'approved'>,
): string {
  return outcome === 'timed_out' ? APPROVAL_TIMED_OUT : USER_DECLINED;
}
