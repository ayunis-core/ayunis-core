import type { Message as RuntimeMessage } from '@ayunis/agent-runtime';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CompleteTurnSelector } from './complete-turn-selector';

const textMessage = (
  role: RuntimeMessage['role'],
  text: string,
): RuntimeMessage => ({
  role,
  content: [{ type: 'text', text }],
});

describe('CompleteTurnSelector', () => {
  it('keeps the newest complete user turns that fit the budget', () => {
    const countTokens = jest.fn().mockReturnValue(30);
    const selector = new CompleteTurnSelector({
      execute: countTokens,
    } as unknown as CountTokensUseCase);
    const messages = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      textMessage('assistant', 'new answer'),
    ];

    const selected = selector.select(messages, 70, extractText);

    expect(selected).toEqual(messages.slice(2));
    expect(messages).toHaveLength(4);
  });

  it('keeps assistant tool calls and their results in the same user turn', () => {
    const selector = new CompleteTurnSelector({
      execute: jest.fn().mockReturnValue(20),
    } as unknown as CountTokensUseCase);
    const messages: RuntimeMessage[] = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'call-1', name: 'search', input: {} },
        ],
      },
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call-1',
            toolName: 'search',
            result: 'municipal record',
          },
        ],
      },
      textMessage('assistant', 'new answer'),
    ];

    const selected = selector.select(messages, 90, extractText);

    expect(selected).toEqual(messages.slice(2));
  });

  it('returns no messages when the newest turn exceeds the budget', () => {
    const selector = new CompleteTurnSelector({
      execute: jest.fn().mockReturnValue(60),
    } as unknown as CountTokensUseCase);
    const messages = [
      textMessage('user', 'question'),
      textMessage('assistant', 'answer'),
    ];

    expect(selector.select(messages, 100, extractText)).toEqual([]);
  });
});

function extractText(message: RuntimeMessage): string {
  return message.content
    .map((content) => (content.type === 'text' ? content.text : 'content'))
    .join('\n');
}
