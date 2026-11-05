import type { BeforeModelCallContext, Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';

/** Every fifth user message, the assistant is reminded to keep memory current. */
export const MEMORY_NUDGE_INTERVAL = 5;

const MEMORY_NUDGE_TEXT = `Memory check-in: compare what you remember about this user with this conversation. If something durable about who they are or how they want to be helped is missing, outdated or wrong, update it now with set_memory and note in one sentence what you changed. If memory is already accurate, say nothing about it and simply continue.`;

/**
 * Appends the reminder as a transient system message on the first provider call
 * of the run.
 *
 * `beforeModelCall` mutations are call-local, so the reminder never reaches
 * `state.messages` and can therefore never be persisted to the thread or shown
 * in the UI. Registering this hook after the context-budget hook also means the
 * append happens after trimming, so the reminder cannot be the thing trimmed
 * away.
 */
@Injectable()
export class MemoryNudgeHookFactory {
  private readonly logger = new Logger(MemoryNudgeHookFactory.name);

  create(params: { threadId: string }): Hook {
    let applied = false;

    return {
      name: 'ayunis-memory-nudge',
      inheritToChildRuns: false,
      beforeModelCall: (ctx: BeforeModelCallContext) => {
        if (applied) {
          return;
        }
        applied = true;
        this.logger.debug({ threadId: params.threadId }, 'Nudging memory');
        ctx.transformMessages((messages) => [
          ...messages,
          {
            role: 'system',
            content: [{ type: 'text', text: MEMORY_NUDGE_TEXT }],
          },
        ]);
      },
    };
  }
}

/**
 * The run was started by a user message (rather than by a client-side tool
 * result) and that message is a multiple of the interval. Counting is done on
 * the thread, which already holds the just-seeded message.
 */
export function shouldNudgeMemory(messages: Message[]): boolean {
  if (!(messages.at(-1) instanceof UserMessage)) {
    return false;
  }

  const userMessageCount = messages.filter(
    (message) => message instanceof UserMessage,
  ).length;

  return userMessageCount > 0 && userMessageCount % MEMORY_NUDGE_INTERVAL === 0;
}
