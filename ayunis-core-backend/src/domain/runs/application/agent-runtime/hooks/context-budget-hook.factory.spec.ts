import type { Message } from '@ayunis/agent-runtime';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CompleteTurnSelector } from '../complete-turn-selector';
import { ContextBudgetHookFactory } from './context-budget-hook.factory';

const textMessage = (role: Message['role'], text: string): Message => ({
  role,
  content: [{ type: 'text', text }],
});

function buildHook(maxTokens: number, tokensPerContent = 20) {
  const countTokens = jest.fn().mockReturnValue(tokensPerContent);
  const selector = new CompleteTurnSelector({
    execute: countTokens,
  } as unknown as CountTokensUseCase);
  const factory = new ContextBudgetHookFactory(selector);
  return {
    hook: factory.create({ maxTokens }),
    countTokens,
  };
}

function getTransform(hook: ReturnType<typeof buildHook>['hook']) {
  const transformMessages = jest.fn();
  hook.beforeModelCall!({ transformMessages } as never);
  return transformMessages.mock.calls[0][0] as (
    messages: readonly Message[],
  ) => Message[];
}

describe('ContextBudgetHookFactory', () => {
  it('keeps the newest complete turn when older turns no longer fit', () => {
    const { hook } = buildHook(70, 30);
    const messages = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      textMessage('assistant', 'new answer'),
    ];

    const trimmed = getTransform(hook)(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('keeps tool use and tool results in the same user turn', () => {
    const { hook } = buildHook(90, 20);
    const messages: Message[] = [
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

    const trimmed = getTransform(hook)(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('fails explicitly when the latest complete turn exceeds the budget', () => {
    const { hook } = buildHook(50, 30);
    const messages = [
      textMessage('user', 'question'),
      textMessage('assistant', 'answer'),
    ];

    expect(() => getTransform(hook)(messages)).toThrow(
      expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }),
    );
  });

  it('fails explicitly when there is no user turn', () => {
    const { hook } = buildHook(100);

    expect(() =>
      getTransform(hook)([textMessage('assistant', 'orphan')]),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('registers a fresh transform before every model call', () => {
    const { hook } = buildHook(100);
    const transformMessages = jest.fn();

    hook.beforeModelCall!({ transformMessages } as never);
    hook.beforeModelCall!({ transformMessages } as never);

    expect(transformMessages).toHaveBeenCalledTimes(2);
  });
});
