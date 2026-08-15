import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { ExecuteToolCommand } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.command';
import {
  isAcknowledgementOnlyTool,
  isExternallyHandledTool,
  isHybridArtifactTool,
} from '../agent-runtime/runtime-tool-policy';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import { ContextService } from 'src/common/context/services/context.service';
import { ToolUsedEvent } from '../events/tool-used.event';
import {
  RunToolCompletedEvent,
  type RunToolOutcome,
} from '../events/run-tool-completed.event';
import type { RunExecutionPath } from '../run-execution-path';
import {
  RunAnonymizationUnavailableError,
  RunToolExecutionFailedError,
} from '../runs.errors';
import { RunToolResultInput } from '../../domain/run-input.entity';

const MAX_TOOL_RESULT_LENGTH = 20000;
const DISPLAY_ACK = 'Tool has been displayed successfully';
const EXTERNAL_TOOL_RESULT = 'Tool execution is handled externally';

export interface ToolResultOutcome {
  toolName: string;
  result: string;
  succeeded: boolean;
}

interface ProcessedToolResult {
  content: ToolResultMessageContent;
  succeeded: boolean;
  piiMasks: ThreadPiiMask[] | null;
}

export interface CollectedToolResults {
  contents: ToolResultMessageContent[];
  /** Per-result success flags, in content order — feeds the run loop's repeated-failure breaker (AYC-646). */
  outcomes: ToolResultOutcome[];
  /** Latest full mask dictionary when any result was anonymized, else null. */
  piiMasks: ThreadPiiMask[] | null;
}

@Injectable()
export class ToolResultCollectorService {
  constructor(
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(ToolResultCollectorService.name)
    private readonly logger: PinoLogger,
  ) {}

  async collectToolResults(params: {
    thread: Thread;
    tools: Tool[];
    input: RunToolResultInput | null;
    orgId: UUID;
    isAnonymous: boolean;
    executionPath: RunExecutionPath;
    message?: AssistantMessage;
  }): Promise<CollectedToolResults> {
    this.logger.debug('collectToolResults');
    const { thread, tools, input, orgId, isAnonymous } = params;

    const lastMessage = params.message ?? thread.getLastMessage();
    const toolUseMessageContent = lastMessage
      ? lastMessage.content.filter(
          (content) => content instanceof ToolUseMessageContent,
        )
      : [];

    const contents: ToolResultMessageContent[] = [];
    const outcomes: ToolResultOutcome[] = [];
    let piiMasks: ThreadPiiMask[] | null = null;

    for (const content of toolUseMessageContent) {
      let result: ProcessedToolResult;
      try {
        result = await this.processToolUse(
          content,
          tools,
          input,
          orgId,
          thread.id,
          isAnonymous,
        );
      } catch (error) {
        this.emitToolCompleted(params.executionPath, 'error', content.name);
        throw error;
      }
      const outcome = result.succeeded ? 'success' : 'error';
      this.emitToolCompleted(params.executionPath, outcome, content.name);
      contents.push(result.content);
      outcomes.push({
        toolName: result.content.toolName,
        result: result.content.result,
        succeeded: result.succeeded,
      });
      // Each anonymization returns the full dictionary — the latest wins.
      piiMasks = result.piiMasks ?? piiMasks;
    }

    return { contents, outcomes, piiMasks };
  }

  private emitToolCompleted(
    executionPath: RunExecutionPath,
    outcome: RunToolOutcome,
    toolName: string,
  ): void {
    if (outcome === 'error') {
      this.logger.warn(
        { execution_path: executionPath, tool_name: toolName },
        'Run tool call failed',
      );
    }
    this.eventEmitter
      .emitAsync(
        RunToolCompletedEvent.EVENT_NAME,
        new RunToolCompletedEvent(executionPath, outcome),
      )
      .catch((error: unknown) => {
        this.logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to emit RunToolCompletedEvent',
        );
      });
  }

  private async processToolUse(
    content: ToolUseMessageContent,
    tools: Tool[],
    input: RunToolResultInput | null,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<ProcessedToolResult> {
    const tool = tools.find((t) => t.name === content.name);
    if (!tool) {
      return {
        content: new ToolResultMessageContent(
          content.id,
          content.name,
          `A tool with the name ${content.name} was not found. Only use tools that are available in your given list of tools.`,
        ),
        succeeded: false,
        piiMasks: null,
      };
    }

    this.emitToolUsedEvent(orgId, content);

    try {
      return await this.executeByRuntimePolicy(
        tool,
        content,
        input,
        orgId,
        threadId,
        isAnonymous,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          toolName: content.name,
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Error processing tool',
      );
      throw new RunToolExecutionFailedError(content.name, {
        error: error as Error,
      });
    }
  }

  private emitToolUsedEvent(orgId: UUID, content: ToolUseMessageContent): void {
    const userId = this.contextService.get('userId');
    this.eventEmitter
      .emitAsync(
        ToolUsedEvent.EVENT_NAME,
        new ToolUsedEvent(
          userId ?? ('unknown' as UUID),
          orgId,
          content.name,
          content.integration?.id as UUID | undefined,
          content.integration?.name,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            toolName: content.name,
          },
          'Failed to emit ToolUsedEvent',
        );
      });
  }

  private async executeByRuntimePolicy(
    tool: Tool,
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<ProcessedToolResult> {
    if (isHybridArtifactTool(tool)) {
      return this.processHybridTool(
        tool,
        content,
        input,
        orgId,
        threadId,
        isAnonymous,
      );
    }
    if (isAcknowledgementOnlyTool(tool)) {
      return {
        ...this.processClientRenderedTool(tool, content, input, DISPLAY_ACK),
        piiMasks: null,
      };
    }
    if (isExternallyHandledTool(tool)) {
      return {
        ...this.processClientRenderedTool(
          tool,
          content,
          input,
          EXTERNAL_TOOL_RESULT,
        ),
        piiMasks: null,
      };
    }
    return this.executeBackendTool(tool, content, orgId, threadId, isAnonymous);
  }

  private async processHybridTool(
    tool: Tool,
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<ProcessedToolResult> {
    const executionResult = await this.executeBackendTool(
      tool,
      content,
      orgId,
      threadId,
      isAnonymous,
    );
    if (executionResult.succeeded) {
      // No re-validation here: the handler already validated the
      // null-stripped input, and rechecking the raw params could reject a
      // call whose side effect just succeeded.
      return {
        ...this.handleClientRenderedTool(content, input, DISPLAY_ACK),
        piiMasks: executionResult.piiMasks,
      };
    }
    return {
      content: executionResult.content,
      succeeded: false,
      piiMasks: executionResult.piiMasks,
    };
  }

  exitLoopAfterAgentResponse(
    agentResponseMessage: AssistantMessage,
    tools: Tool[],
  ): boolean {
    const responseDoesNotContainToolCalls = agentResponseMessage.content.every(
      (content) => content.type !== MessageContentType.TOOL_USE,
    );
    if (responseDoesNotContainToolCalls) return true;

    try {
      const calls = agentResponseMessage.content
        .filter((content) => content instanceof ToolUseMessageContent)
        .map((content) => ({
          content,
          tool: this.findTool(content, tools),
        }));
      const hasExternalCall = calls.some(
        ({ tool }) => tool !== undefined && isExternallyHandledTool(tool),
      );
      const allCallsValid = calls.every(({ content, tool }) =>
        this.isValidForTerminalPhase(content, tool),
      );
      if (hasExternalCall && allCallsValid) return true;
    } catch (error) {
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Error checking for display tools',
      );
    }

    return false;
  }

  private findTool(
    content: ToolUseMessageContent,
    tools: Tool[],
  ): Tool | undefined {
    const tool = tools.find((candidate) => candidate.name === content.name);
    if (!tool) {
      this.logger.warn(
        { toolName: content.name },
        'Tool mentioned in response but not found',
      );
      return undefined;
    }
    return tool;
  }

  private isValidForTerminalPhase(
    content: ToolUseMessageContent,
    tool: Tool | undefined,
  ): boolean {
    if (!tool) return false;
    if (!isAcknowledgementOnlyTool(tool) && !isExternallyHandledTool(tool)) {
      return true;
    }
    return this.validateClientRenderedParams(tool, content) === null;
  }

  private processClientRenderedTool(
    tool: Tool,
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
    defaultResult: string,
  ): { content: ToolResultMessageContent; succeeded: boolean } {
    // An explicit frontend-supplied result means the user already interacted
    // with the rendered widget — never block it on (possibly historical)
    // invalid params.
    if (input?.toolId !== content.id) {
      const validationError = this.validateClientRenderedParams(tool, content);
      if (validationError !== null) {
        return {
          content: new ToolResultMessageContent(
            content.id,
            content.name,
            `The tool didn't provide any result due to the following error in tool usage: ${validationError}`,
          ),
          succeeded: false,
        };
      }
    }
    return this.handleClientRenderedTool(content, input, defaultResult);
  }

  private handleClientRenderedTool(
    content: ToolUseMessageContent,
    input: RunToolResultInput | null,
    defaultResult: string,
  ): { content: ToolResultMessageContent; succeeded: boolean } {
    if (input?.toolId === content.id) {
      return {
        content: new ToolResultMessageContent(
          input.toolId,
          input.toolName,
          input.result,
        ),
        succeeded: true,
      };
    }
    return {
      content: new ToolResultMessageContent(
        content.id,
        content.name,
        defaultResult,
      ),
      succeeded: true,
    };
  }

  /**
   * Client-rendered tools bypass backend execution, so this is the only place
   * their schema runs; the returned message is model-actionable (AYC-646
   * formatting) and null means the params are valid. Nulls are stripped the
   * same way `ExecuteToolUseCase` does for executable tools, so a
   * strict-mode model's explicit null for an optional param never fails a
   * client-rendered call.
   */
  private validateClientRenderedParams(
    tool: Tool,
    content: ToolUseMessageContent,
  ): string | null {
    try {
      tool.validateParams(
        stripDisallowedNulls(content.params, tool.parameters),
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid parameters';
    }
  }

  private async executeBackendTool(
    tool: Tool,
    content: ToolUseMessageContent,
    orgId: UUID,
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<{
    content: ToolResultMessageContent;
    succeeded: boolean;
    piiMasks: ThreadPiiMask[] | null;
  }> {
    const context = {
      orgId,
      threadId,
      isAnonymous,
    };
    let succeeded = true;
    let result = await this.executeToolUseCase
      .execute(new ExecuteToolCommand(tool, content.params, context))
      .catch((error) => {
        succeeded = false;
        if (error instanceof ToolExecutionFailedError && error.exposeToLLM) {
          return `The tool didn't provide any result due to the following error in tool usage: ${error.message}`;
        } else {
          return `The tool didn't provide any result due to an unknown error`;
        }
      });

    if (result.length > MAX_TOOL_RESULT_LENGTH) {
      result = `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
    }

    let piiMasks: ThreadPiiMask[] | null = null;
    if (isAnonymous && tool.returnsPii) {
      const anonymized = await this.anonymizeText(result, orgId, threadId);
      result = anonymized.anonymizedText;
      piiMasks = anonymized.masks;
    }

    return {
      content: new ToolResultMessageContent(content.id, content.name, result),
      succeeded,
      piiMasks,
    };
  }

  private async anonymizeText(
    text: string,
    orgId: UUID,
    threadId: UUID,
  ): Promise<{ anonymizedText: string; masks: ThreadPiiMask[] }> {
    try {
      const result = await this.anonymizeTextForThreadUseCase.execute(
        new AnonymizeTextForThreadCommand(text, orgId, threadId),
      );
      return { anonymizedText: result.anonymizedText, masks: result.masks };
    } catch (error) {
      throw new RunAnonymizationUnavailableError(
        {
          originalError:
            error instanceof Error ? error.message : 'Unknown error',
        },
        error,
      );
    }
  }
}
