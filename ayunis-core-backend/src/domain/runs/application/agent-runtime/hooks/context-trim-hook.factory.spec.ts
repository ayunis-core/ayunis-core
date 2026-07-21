import type { Message } from '@ayunis/inference';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { ContextTrimHookFactory } from './context-trim-hook.factory';

function message(role: Message['role'], text: string): Message {
  return { role, content: [{ type: 'text', text }] };
}

/** Fires the hook's `beforeModelCall` and returns the transformed messages. */
function trim(
  factory: ContextTrimHookFactory,
  maxTokens: number,
  messages: Message[],
): Message[] {
  const hook = factory.create({ maxTokens });
  let transform: ((messages: readonly Message[]) => Message[]) | undefined;
  const ctx = {
    transformMessages: (fn: (messages: readonly Message[]) => Message[]) => {
      transform = fn;
    },
  };
  hook.beforeModelCall?.(ctx as never);
  if (!transform) {
    throw new Error('beforeModelCall did not register a transform');
  }
  return transform(messages);
}

// Every message counts as 10 tokens, keeping the budget arithmetic obvious.
function buildFactory(): ContextTrimHookFactory {
  const countTokensUseCase = {
    execute: jest.fn().mockReturnValue(10),
  } as unknown as CountTokensUseCase;
  return new ContextTrimHookFactory(countTokensUseCase);
}

describe('ContextTrimHookFactory', () => {
  it('drops the oldest messages so the prompt stays within budget', () => {
    const factory = buildFactory();
    const messages = [
      message('user', 'oldest'),
      message('assistant', 'middle'),
      message('user', 'newest'),
    ];

    // budget of 25 fits two 10-token messages; user-anchoring keeps the newest
    const result = trim(factory, 25, messages);

    expect(result).toEqual([message('user', 'newest')]);
  });

  it('leaves messages untouched when no user-anchored suffix fits', () => {
    const factory = buildFactory();
    const messages = [
      message('user', 'huge user turn'),
      message('assistant', 'tool call'),
      message('tool_result', 'result'),
    ];

    // budget only fits the trailing assistant + tool_result (no user), so the
    // suffix would be empty — the hook must fall back to the full list.
    const result = trim(factory, 25, messages);

    expect(result).toEqual(messages);
  });

  it('keeps messages that already fit the budget', () => {
    const factory = buildFactory();
    const messages = [message('user', 'hi')];

    expect(trim(factory, 80000, messages)).toEqual(messages);
  });
});
