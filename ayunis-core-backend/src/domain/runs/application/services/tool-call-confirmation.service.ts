import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolCallDecision } from 'src/domain/messages/domain/value-objects/tool-call-decision.object';
import { AllowMcpToolUseCase } from 'src/domain/mcp/application/use-cases/allow-mcp-tool/allow-mcp-tool.use-case';
import { AllowMcpToolCommand } from 'src/domain/mcp/application/use-cases/allow-mcp-tool/allow-mcp-tool.command';
import {
  McpIntegrationAccessDeniedError,
  McpIntegrationNotFoundError,
} from 'src/domain/mcp/application/mcp.errors';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import {
  RunToolDecisionsInput,
  RunToolResultInput,
  type RunInput,
} from 'src/domain/runs/domain/run-input.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { parseMcpCanonicalName } from 'src/domain/tools/domain/value-objects/mcp-canonical-name';

export const REJECTED_TOOL_RESULT = 'The user rejected this tool call.';
const NOT_RUN_TOOL_RESULT =
  'This tool call was not run because the user sent a new message instead.';

/**
 * The calls of the thread's last turn that were held for the user's
 * confirmation. They are all unanswered: a turn's results follow it.
 */
export function findCallsAwaitingConfirmation(
  thread: Thread,
): ToolUseMessageContent[] {
  return (thread.getLastMessage()?.content ?? []).filter(
    (content): content is ToolUseMessageContent =>
      content instanceof ToolUseMessageContent && content.requiresConfirmation,
  );
}

/**
 * Answers every call of a turn awaiting confirmation when the user sends a
 * new message instead of deciding. Nothing runs, so rolling these results
 * back after a failed run cannot repeat a side effect.
 */
export function answerWithoutRunning(
  thread: Thread,
): ToolResultMessageContent[] {
  if (findCallsAwaitingConfirmation(thread).length === 0) return [];
  return (thread.getLastMessage()?.content ?? [])
    .filter(
      (content): content is ToolUseMessageContent =>
        content instanceof ToolUseMessageContent,
    )
    .map((call) =>
      call.requiresConfirmation
        ? new ToolResultMessageContent(
            call.id,
            call.name,
            REJECTED_TOOL_RESULT,
            ToolCallDecision.REJECTED,
          )
        : new ToolResultMessageContent(call.id, call.name, NOT_RUN_TOOL_RESULT),
    );
}

@Injectable()
export class ToolCallConfirmationService {
  private readonly logger = new Logger(ToolCallConfirmationService.name);

  constructor(private readonly allowMcpToolUseCase: AllowMcpToolUseCase) {}

  /**
   * Calls awaiting confirmation are answered only by exactly one decision
   * each; a client tool result must not run them unconfirmed.
   */
  validateInput(thread: Thread, input: RunInput): void {
    const awaiting = findCallsAwaitingConfirmation(thread);
    if (input instanceof RunToolDecisionsInput) {
      validateDecisions(awaiting, input);
    } else if (input instanceof RunToolResultInput && awaiting.length > 0) {
      throw new RunInvalidInputError(
        'Tool calls awaiting confirmation need a decision',
        { toolCallIds: awaiting.map((call) => call.id) },
      );
    }
  }

  async saveAlwaysAllowedTools(
    thread: Thread,
    input: RunToolDecisionsInput,
  ): Promise<void> {
    const awaiting = findCallsAwaitingConfirmation(thread);
    for (const decision of input.decisions) {
      if (!decision.approved || !decision.alwaysAllow) continue;
      const call = awaiting.find((c) => c.id === decision.toolCallId);
      if (call) await this.allowTool(call);
    }
  }

  private async allowTool(call: ToolUseMessageContent): Promise<void> {
    const integrationId = call.integration?.id;
    const toolName =
      integrationId && parseMcpCanonicalName('tool', call.name, integrationId);
    if (!integrationId || !toolName) {
      this.logger.warn(
        { toolCallId: call.id, toolName: call.name },
        'Cannot always allow a call that is no MCP tool call',
      );
      return;
    }
    try {
      await this.allowMcpToolUseCase.execute(
        new AllowMcpToolCommand(integrationId as UUID, toolName),
      );
    } catch (error) {
      // The call itself then settles as "tool not found".
      if (
        error instanceof McpIntegrationNotFoundError ||
        error instanceof McpIntegrationAccessDeniedError
      ) {
        this.logger.warn(
          { toolCallId: call.id, integrationId },
          'Integration of an always-allowed tool is unavailable',
        );
        return;
      }
      throw error;
    }
  }
}

function validateDecisions(
  awaiting: readonly ToolUseMessageContent[],
  input: RunToolDecisionsInput,
): void {
  const awaitingIds = new Set(awaiting.map((call) => call.id));
  const decided = new Set<string>();
  for (const { toolCallId } of input.decisions) {
    if (!awaitingIds.has(toolCallId)) {
      throw new RunInvalidInputError('Tool call is not awaiting confirmation', {
        toolCallId,
      });
    }
    if (decided.has(toolCallId)) {
      throw new RunInvalidInputError('Tool call was decided more than once', {
        toolCallId,
      });
    }
    decided.add(toolCallId);
  }
  const undecided = [...awaitingIds].filter((id) => !decided.has(id));
  if (undecided.length > 0) {
    throw new RunInvalidInputError(
      'Every tool call awaiting confirmation needs a decision',
      { toolCallIds: undecided },
    );
  }
}
