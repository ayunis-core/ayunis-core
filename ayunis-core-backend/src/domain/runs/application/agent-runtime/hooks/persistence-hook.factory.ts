import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import { assistantMessageId } from '../assistant-message-id';
import { toBackendAssistantMessage } from '../inference-message.mapper';

/**
 * Builds the persistence hook for a run: it saves each assistant turn as the
 * runtime completes the model call (`afterModelCall`), inside the loop, so a
 * disconnected SSE client can't drop the message. The assistant id is derived
 * deterministically so the persisted copy matches the streamed one.
 *
 * Tool-result persistence is added with the tool loop in a later slice.
 */
@Injectable()
export class PersistenceHookFactory {
  constructor(
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
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
    };
  }
}
