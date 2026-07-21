import type { Hook, RunContext } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { assistantMessageId, toolResultMessageId } from '../message-id';
import { toBackendAssistantMessage } from '../inference-message.mapper';

/** Per-run RunContext key for tool results awaiting a grouped flush. */
const PENDING_TOOL_RESULTS = Symbol('ayunis:pendingToolResults');

/** The tool results of one iteration, grouped for a single-message flush. */
interface PendingToolResults {
  iteration: number;
  contents: ToolResultMessageContent[];
}

/**
 * Builds the persistence hook for a run. Assistant turns are saved as the model
 * call completes (`afterModelCall`); tool results are accumulated per iteration
 * and flushed as one grouped message before the next model call (and at run
 * end) — providers require every tool result for an assistant turn in a single
 * message. Persistence runs inside the loop so a disconnected SSE client can't
 * drop messages. The assistant id is derived deterministically so the persisted
 * copy matches the streamed one.
 */
@Injectable()
export class PersistenceHookFactory {
  constructor(
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
  ) {}

  create(params: { threadId: UUID }): Hook {
    return {
      name: 'ayunis-persistence',
      afterModelCall: async (ctx) => {
        const message = toBackendAssistantMessage(
          ctx.message,
          params.threadId,
          assistantMessageId(ctx.context.runId, ctx.iteration),
        );
        await this.saveAssistantMessageUseCase.execute(
          new SaveAssistantMessageCommand(message),
        );
      },
      afterToolCall: (ctx) => {
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
      },
      beforeModelCall: (ctx) =>
        this.flushToolResults(ctx.context, params.threadId),
      runEnd: (ctx) => this.flushToolResults(ctx.context, params.threadId),
    };
  }

  private async flushToolResults(
    context: RunContext,
    threadId: UUID,
  ): Promise<void> {
    const pending = context.get<PendingToolResults>(PENDING_TOOL_RESULTS);
    if (!pending || pending.contents.length === 0) {
      return;
    }
    context.set(PENDING_TOOL_RESULTS, {
      iteration: pending.iteration,
      contents: [],
    });
    await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(
        threadId,
        pending.contents,
        toolResultMessageId(context.runId, pending.iteration),
      ),
    );
  }
}
