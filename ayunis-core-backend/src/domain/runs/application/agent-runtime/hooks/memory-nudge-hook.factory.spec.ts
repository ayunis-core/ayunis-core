import type { BeforeModelCallContext, Message } from '@ayunis/agent-runtime';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { randomUUID } from 'crypto';
import {
  MEMORY_NUDGE_INTERVAL,
  MemoryNudgeHookFactory,
  shouldNudgeMemory,
} from './memory-nudge-hook.factory';

function userMessage(): UserMessage {
  return new UserMessage({
    threadId: randomUUID(),
    content: [new TextMessageContent('hi')],
  });
}

function assistantMessage(): AssistantMessage {
  return new AssistantMessage({
    threadId: randomUUID(),
    content: [new TextMessageContent('hello')],
  });
}

function toolResultMessage(): ToolResultMessage {
  return new ToolResultMessage({
    threadId: randomUUID(),
    content: [
      new ToolResultMessageContent(randomUUID(), 'some_tool', 'result'),
    ],
  });
}

/** A thread of `count` completed user/assistant exchanges. */
function exchanges(count: number) {
  return Array.from({ length: count }, () => [
    userMessage(),
    assistantMessage(),
  ]).flat();
}

describe('shouldNudgeMemory', () => {
  it('does not fire before the interval is reached', () => {
    for (let sent = 1; sent < MEMORY_NUDGE_INTERVAL; sent++) {
      const messages = [...exchanges(sent - 1), userMessage()];

      expect(shouldNudgeMemory(messages)).toBe(false);
    }
  });

  it('fires on every multiple of the interval', () => {
    for (const multiple of [1, 2, 3]) {
      const sent = MEMORY_NUDGE_INTERVAL * multiple;
      const messages = [...exchanges(sent - 1), userMessage()];

      expect(shouldNudgeMemory(messages)).toBe(true);
    }
  });

  // A client-executed tool result starts another run without adding a user
  // message; without this guard the same user message would nudge twice.
  it('does not fire on a run seeded by a tool result', () => {
    const sent = MEMORY_NUDGE_INTERVAL;
    const messages = [
      ...exchanges(sent - 1),
      userMessage(),
      assistantMessage(),
      toolResultMessage(),
    ];

    expect(shouldNudgeMemory(messages)).toBe(false);
  });

  it('does not fire on an empty thread', () => {
    expect(shouldNudgeMemory([])).toBe(false);
  });
});

describe('MemoryNudgeHookFactory', () => {
  function callContext(): {
    ctx: BeforeModelCallContext;
    apply: (messages: Message[]) => Message[];
  } {
    const transforms: ((messages: readonly Message[]) => Message[])[] = [];
    const ctx = {
      transformMessages: (fn: (messages: readonly Message[]) => Message[]) => {
        transforms.push(fn);
      },
    } as unknown as BeforeModelCallContext;

    return {
      ctx,
      apply: (messages) =>
        transforms.reduce<Message[]>((acc, fn) => fn(acc), messages),
    };
  }

  it('appends the reminder as a trailing system message', () => {
    const hook = new MemoryNudgeHookFactory().create({ threadId: 'thread-1' });
    const { ctx, apply } = callContext();

    hook.beforeModelCall?.(ctx);
    const messages = apply([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('system');
    expect(JSON.stringify(messages[1].content)).toContain('Memory check-in');
  });

  it('applies once per run, not once per model call', () => {
    const hook = new MemoryNudgeHookFactory().create({ threadId: 'thread-1' });

    const first = callContext();
    hook.beforeModelCall?.(first.ctx);
    const second = callContext();
    hook.beforeModelCall?.(second.ctx);

    expect(first.apply([])).toHaveLength(1);
    expect(second.apply([])).toHaveLength(0);
  });
});
