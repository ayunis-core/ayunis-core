import type { Message as RuntimeMessage } from '@ayunis/agent-runtime';
import { selectCompleteTurns } from './complete-turn-selector';

const textMessage = (
  role: RuntimeMessage['role'],
  text: string,
): RuntimeMessage => ({
  role,
  content: [{ type: 'text', text }],
});

const countTokens = (tokens: number) => () => tokens;

describe('selectCompleteTurns', () => {
  it('keeps the newest complete user turns that fit the budget', () => {
    const messages = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      textMessage('assistant', 'new answer'),
    ];

    const selection = selectCompleteTurns(messages, {
      maxTokens: 70,
      countTokens: countTokens(30),
    });

    expect(selection).toEqual({ messages: messages.slice(2), tokens: 60 });
    expect(messages).toHaveLength(4);
  });

  it('keeps assistant tool calls and their results in the same user turn', () => {
    const messages: RuntimeMessage[] = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'c1', name: 'search', input: { q: 'new' } },
        ],
      },
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'c1',
            toolName: 'search',
            result: 'result',
          },
        ],
      },
      textMessage('assistant', 'new answer'),
    ];

    const selection = selectCompleteTurns(messages, {
      maxTokens: 90,
      countTokens: countTokens(20),
    });

    expect(selection.messages).toEqual(messages.slice(2));
  });

  it('returns no messages when the newest turn exceeds the budget', () => {
    const messages = [
      textMessage('user', 'question'),
      textMessage('assistant', 'answer'),
    ];

    expect(
      selectCompleteTurns(messages, {
        maxTokens: 100,
        countTokens: countTokens(60),
      }),
    ).toEqual({ messages: [], tokens: 0 });
  });

  it('considers only the newest turns when asked', () => {
    const messages = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      textMessage('assistant', 'new answer'),
    ];

    expect(
      selectCompleteTurns(messages, {
        maxTokens: 1_000,
        maxTurns: 1,
        countTokens: countTokens(10),
      }),
    ).toEqual({ messages: messages.slice(2), tokens: 20 });
  });

  it('ignores messages before the first user turn', () => {
    const messages = [
      textMessage('assistant', 'orphan'),
      textMessage('user', 'question'),
    ];

    expect(
      selectCompleteTurns(messages, {
        maxTokens: 100,
        countTokens: countTokens(10),
      }).messages,
    ).toEqual(messages.slice(1));
  });
});
