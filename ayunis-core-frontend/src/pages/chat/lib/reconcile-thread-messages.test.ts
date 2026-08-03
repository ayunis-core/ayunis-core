import { describe, expect, it } from 'vitest';
import type { Message } from '../model/openapi';
import { reconcileMessages } from './reconcile-thread-messages';

function message(
  id: string,
  role: Message['role'],
  content: unknown[],
): Message {
  return {
    id,
    role,
    content,
    createdAt: '2026-08-03T00:00:00.000Z',
  } as Message;
}

const invalidToolCall = {
  type: 'tool_use',
  id: 'tool-1',
  name: 'bar_chart',
  params: {},
  stream: {
    status: 'invalid' as const,
    argumentsJson: '{"title":',
  },
};

function reconcile(
  currentMessages: Message[],
  persistedMessages: Message[],
): Message[] {
  return reconcileMessages(
    currentMessages,
    { id: 'thread-1' },
    { id: 'thread-1', messages: persistedMessages },
  );
}

describe('reconcileMessages', () => {
  it('keeps invalid tool calls when the persisted assistant message omits them', () => {
    const current = [
      message('user-1', 'user', [{ type: 'text', text: 'chart it' }]),
      message('assistant-1', 'assistant', [
        { type: 'text', text: 'I tried.' },
        invalidToolCall,
      ]),
    ];
    const persisted = [
      message('user-1', 'user', [{ type: 'text', text: 'chart it' }]),
      message('assistant-1', 'assistant', [{ type: 'text', text: 'I tried.' }]),
    ];

    const result = reconcile(current, persisted);

    expect(result[1].content).toContainEqual(invalidToolCall);
  });

  it('keeps an invalid-only assistant message missing from persistence', () => {
    const current = [
      message('user-1', 'user', [{ type: 'text', text: 'chart it' }]),
      message('assistant-1', 'assistant', [invalidToolCall]),
    ];
    const persisted = [
      message('user-1', 'user', [{ type: 'text', text: 'chart it' }]),
    ];

    const result = reconcile(current, persisted);

    expect(result).toHaveLength(2);
    expect(result[1].content).toEqual([invalidToolCall]);
  });

  it('does not retain in-progress tool calls', () => {
    const streamingToolCall = {
      ...invalidToolCall,
      stream: { status: 'streaming' as const, argumentsJson: '{"title"' },
    };
    const current = [message('assistant-1', 'assistant', [streamingToolCall])];

    expect(reconcile(current, [])).toEqual([]);
  });

  it('does not carry invalid calls into another thread', () => {
    const current = [message('assistant-1', 'assistant', [invalidToolCall])];
    const nextMessages = [
      message('user-2', 'user', [{ type: 'text', text: 'new thread' }]),
    ];

    const result = reconcileMessages(
      current,
      { id: 'thread-1' },
      { id: 'thread-2', messages: nextMessages },
    );

    expect(result).toEqual(nextMessages);
  });
});
