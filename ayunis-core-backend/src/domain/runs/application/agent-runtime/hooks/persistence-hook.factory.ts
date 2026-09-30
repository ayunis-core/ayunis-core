import {
  RunAbortedError,
  type AfterModelTurnContext,
  type AssistantMessage as RuntimeAssistantMessage,
  type Hook,
  type ReadonlySnapshot,
  type RunContext,
} from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import {
  assistantMessageId,
  toolResultMessageId,
} from 'src/domain/runs/application/agent-runtime/message-id';
import { toBackendAssistantMessage } from 'src/domain/runs/application/agent-runtime/inference-message.mapper';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';

/** Per-run RunContext key for tool results awaiting a grouped flush. */
const PENDING_TOOL_RESULTS = Symbol('ayunis:pendingToolResults');

/** The tool results of one iteration, grouped for a single-message flush. */
interface PendingToolResults {
  iteration: number;
  contents: ToolResultMessageContent[];
}

/**
 * Builds the persistence hook for a run. Assistant turns are saved once the
 * logical model turn reaches its terminal outcome, so retries and recovery do
 * not persist superseded calls. Tool results are accumulated per iteration and
 * flushed as one grouped message before the next model turn (and at run end).
 * The assistant id is derived deterministically so the persisted copy matches
 * the streamed one.
 */
@Injectable()
export class PersistenceHookFactory {
  constructor(
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
  ) {}

  create(params: {
    thread: Thread;
    integrations: RuntimeToolIntegrationRegistry;
  }): Hook {
    return {
      name: 'ayunis-persistence',
      inheritToChildRuns: false,
      terminalFailureMode: 'critical',
      afterModelTurn: (ctx) =>
        this.persistAssistantMessageOrAbort(
          ctx,
          params.thread,
          params.integrations,
        ),
      afterToolCall: async (ctx) => {
        const pending = ctx.context.get<PendingToolResults>(
          PENDING_TOOL_RESULTS,
        ) ?? { iteration: ctx.iteration, contents: [] };
        pending.iteration = ctx.iteration;
        pending.contents.push(
          new ToolResultMessageContent(
            ctx.toolCall.id,
            ctx.toolCall.name,
            ctx.result,
          ),
        );
        ctx.context.set(PENDING_TOOL_RESULTS, pending);
        if (ctx.isLastToolCall) {
          await this.flushToolResults(ctx.context, params.thread);
        }
      },
      beforeModelTurn: (ctx) =>
        this.flushToolResults(ctx.context, params.thread),
      runEnd: (ctx) => this.flushToolResults(ctx.context, params.thread),
    };
  }

  private async persistAssistantMessageOrAbort(
    ctx: AfterModelTurnContext,
    thread: Thread,
    integrations: RuntimeToolIntegrationRegistry,
  ): Promise<void> {
    const message = assistantMessageForTurn(ctx);
    if (!message) return;
    const persisted = await this.persistAssistantMessage(
      message,
      thread,
      assistantMessageId(ctx.context.runId, ctx.iteration),
      integrations,
    );
    if (!persisted) ctx.abort('thread no longer exists');
  }

  private async persistAssistantMessage(
    message: RuntimeAssistantMessage,
    thread: Thread,
    id: UUID,
    integrations: RuntimeToolIntegrationRegistry,
  ): Promise<boolean> {
    if (message.content.length === 0) {
      return true;
    }
    const backendMessage = toBackendAssistantMessage(
      message,
      thread.id,
      id,
      integrations,
    );
    const saved = await this.saveAssistantMessageUseCase.execute(
      new SaveAssistantMessageCommand(backendMessage),
    );
    if (!saved) return false;
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(thread, saved),
    );
    return true;
  }

  private async flushToolResults(
    context: RunContext,
    thread: Thread,
  ): Promise<void> {
    const pending = context.get<PendingToolResults>(PENDING_TOOL_RESULTS);
    if (!pending || pending.contents.length === 0) {
      return;
    }
    // Drained before the write, not after it: the runEnd flush exists to
    // persist contents no earlier phase attempted, not to retry a write that
    // already failed. Retrying one turned every persistence failure into a
    // second, critical finalization failure that hid the real cause (AYC-904).
    context.set(PENDING_TOOL_RESULTS, {
      iteration: pending.iteration,
      contents: [],
    });
    const saved = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(
        thread.id,
        pending.contents,
        toolResultMessageId(context.runId, pending.iteration),
      ),
    );
    if (!saved) {
      throw new RunAbortedError(
        'Run aborted because the thread no longer exists',
      );
    }
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(thread, saved),
    );
  }
}

function assistantMessageForTurn(
  ctx: AfterModelTurnContext,
): RuntimeAssistantMessage | undefined {
  const call = 'call' in ctx.outcome ? ctx.outcome.call : undefined;
  if (!call) return undefined;
  if (ctx.outcome.type === 'accepted' && call.type === 'accepted') {
    return cloneAssistantMessage(call.message);
  }
  if (
    call.type === 'rejected' ||
    !call.visibleOutput ||
    call.message.content.length === 0
  ) {
    return undefined;
  }
  return cloneAssistantMessage(
    call.message,
    call.message.content.filter(
      (content) => content.type === 'text' || content.type === 'thinking',
    ),
  );
}

function cloneAssistantMessage(
  message: ReadonlySnapshot<RuntimeAssistantMessage>,
  content: ReadonlySnapshot<RuntimeAssistantMessage>['content'] = message.content,
): RuntimeAssistantMessage {
  return {
    role: 'assistant',
    content: content.map((item) => structuredClone(item)),
  };
}
