import { describe, expect, it } from 'vitest';
import type { ChatThreadSnapshot } from './chat-conversation-config';
import { removePendingToolCalls } from './remove-pending-tool-calls';

type Message = ChatThreadSnapshot['messages'][number];

const user = {
  id: 'user-1',
  role: 'user',
  content: [{ type: 'text', text: 'Create a report' }],
  createdAt: '2026-11-06T00:00:00.000Z',
} as unknown as Message;

const assistant = (content: unknown[]): Message =>
  ({
    id: 'assistant-1',
    role: 'assistant',
    content,
    createdAt: '2026-11-06T00:00:01.000Z',
  }) as unknown as Message;

const toolCall = (stream?: { status: string; argumentsJson: string }) => ({
  type: 'tool_use',
  id: 'call-1',
  name: 'create_document',
  params: {},
  ...(stream ? { stream } : {}),
});

describe('removePendingToolCalls', () => {
  it('keeps the text and thinking of the last assistant message', () => {
    const messages = [
      user,
      assistant([
        { type: 'thinking', thinking: 'Plan' },
        { type: 'text', text: 'Creating it' },
        toolCall({ status: 'streaming', argumentsJson: '{"ti' }),
      ]),
    ];

    expect(removePendingToolCalls(messages)[1].content).toEqual([
      { type: 'thinking', thinking: 'Plan' },
      { type: 'text', text: 'Creating it' },
    ]);
  });

  it('removes an unsaved message that only prepares tools', () => {
    const messages = [
      user,
      assistant([toolCall({ status: 'streaming', argumentsJson: '' })]),
    ];

    expect(removePendingToolCalls(messages)).toEqual([user]);
  });

  it('keeps a message whose tool calls were already finalized', () => {
    const messages = [user, assistant([toolCall()])];

    expect(removePendingToolCalls(messages)).toBe(messages);
  });

  it('leaves messages unchanged when the last one is from the user', () => {
    const messages = [user];

    expect(removePendingToolCalls(messages)).toBe(messages);
  });
});
