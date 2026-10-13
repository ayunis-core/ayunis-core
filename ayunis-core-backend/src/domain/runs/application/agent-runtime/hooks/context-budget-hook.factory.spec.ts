import {
  RunContext,
  type Message,
  type TokenEstimator,
  type Tool,
} from '@ayunis/agent-runtime';
import { Logger } from '@nestjs/common';
import { ContextBudgetHookFactory } from './context-budget-hook.factory';

const textMessage = (role: Message['role'], text: string): Message => ({
  role,
  content: [{ type: 'text', text }],
});

/** Counts every text by its length; tools by their JSON. */
function lengthEstimator(exact = false): TokenEstimator {
  return {
    exact,
    tokensPerMessage: 0,
    tokensPerImage: 1_600,
    countText: (text) => text.length,
    countTools: (tools) => (tools.length ? JSON.stringify(tools).length : 0),
  };
}

/** Counts every text and every tool set as a fixed number of tokens. */
function fixedEstimator(tokensPerContent: number): TokenEstimator {
  return {
    exact: false,
    tokensPerMessage: 0,
    tokensPerImage: 1_600,
    countText: (text) => (text ? tokensPerContent : 0),
    countTools: (tools) => (tools.length ? tokensPerContent : 0),
  };
}

type BudgetHook = ReturnType<ContextBudgetHookFactory['create']>;
type Transform = (messages: readonly Message[]) => Message[];

interface TurnRequest {
  instructions?: string;
  tools?: Tool[];
  tokens?: TokenEstimator;
}

function buildHook(contextWindowTokens: number): BudgetHook {
  return new ContextBudgetHookFactory().create({
    model: {
      provider: 'anthropic',
      name: 'claude',
      contextWindowSize: contextWindowTokens,
    },
  });
}

function getTransform(
  hook: BudgetHook,
  request: TurnRequest,
  context = RunContext.create(),
): Transform {
  const transformMessages = jest.fn();
  hook.beforeModelTurn!({
    transformMessages,
    context,
    model: { name: 'mock', stream: jest.fn(), tokens: request.tokens },
    instructions: request.instructions ?? '',
    tools: request.tools ?? [],
  } as never);
  return transformMessages.mock.calls[0][0] as Transform;
}

const conversation = [
  textMessage('user', 'a'.repeat(30)),
  textMessage('assistant', 'b'.repeat(30)),
  textMessage('user', 'c'.repeat(30)),
  textMessage('assistant', 'd'.repeat(30)),
];

describe('ContextBudgetHookFactory', () => {
  it('does not inherit the root model context budget into child runs', () => {
    expect(buildHook(100).inheritToChildRuns).toBe(false);
  });

  it('keeps the newest complete turn when older turns no longer fit', () => {
    const messages = [
      textMessage('user', 'old question'),
      textMessage('assistant', 'old answer'),
      textMessage('user', 'new question'),
      textMessage('assistant', 'new answer'),
    ];

    const trimmed = getTransform(buildHook(78), {
      tokens: fixedEstimator(30),
    })(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('keeps tool use and tool results in the same user turn', () => {
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

    const trimmed = getTransform(buildHook(100), {
      tokens: fixedEstimator(20),
    })(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('fails explicitly when the latest complete turn exceeds the budget', () => {
    const messages = [
      textMessage('user', 'question'),
      textMessage('assistant', 'answer'),
    ];

    expect(() =>
      getTransform(buildHook(56), { tokens: fixedEstimator(30) })(messages),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('fails explicitly when there is no user turn', () => {
    expect(() =>
      getTransform(buildHook(100), { tokens: fixedEstimator(20) })([
        textMessage('assistant', 'orphan'),
      ]),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('keeps the whole conversation when it fits next to the request parts', () => {
    expect(
      getTransform(buildHook(200), { tokens: lengthEstimator() })(conversation),
    ).toEqual(conversation);
  });

  it('leaves room for the instructions sent with every model call', () => {
    const trimmed = getTransform(buildHook(200), {
      tokens: lengthEstimator(),
      instructions: 'i'.repeat(70),
    })(conversation);

    expect(trimmed).toEqual(conversation.slice(2));
  });

  it('leaves room for the tool schemas sent with every model call', () => {
    const tool: Tool = {
      name: 'search',
      description: 's'.repeat(20),
      parameters: { type: 'object', properties: {} },
    };

    const trimmed = getTransform(buildHook(200), {
      tokens: lengthEstimator(),
      tools: [tool],
    })(conversation);

    expect(trimmed).toEqual(conversation.slice(2));
  });

  it('counts images at the estimator image cost instead of treating them as free', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'what is this?' },
          { type: 'image', data: 'base64', mediaType: 'image/png' },
        ],
      },
      textMessage('assistant', 'a cat'),
      textMessage('user', 'thanks'),
      textMessage('assistant', 'you are welcome'),
    ];

    const trimmed = getTransform(buildHook(1_800), {
      tokens: lengthEstimator(),
    })(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('counts per-message framing for providers that report it', () => {
    const framed: TokenEstimator = {
      ...lengthEstimator(true),
      tokensPerMessage: 5,
    };

    const trimmed = getTransform(buildHook(140), { tokens: framed })(
      conversation,
    );

    expect(trimmed).toEqual(conversation.slice(2));
  });

  it('gives an exact tokenizer less headroom than the shared estimate', () => {
    const estimated = getTransform(buildHook(200), {
      tokens: lengthEstimator(false),
      instructions: 'i'.repeat(65),
    })(conversation);
    const exact = getTransform(buildHook(200), {
      tokens: lengthEstimator(true),
      instructions: 'i'.repeat(65),
    })(conversation);

    expect(estimated).toEqual(conversation.slice(2));
    expect(exact).toEqual(conversation);
  });

  it('falls back to the shared estimate when the provider has no estimator', () => {
    const trimmed = getTransform(buildHook(200_000), {})(conversation);

    expect(trimmed).toEqual(conversation);
  });

  it('fails explicitly when the request parts leave no room for the latest turn', () => {
    expect(() =>
      getTransform(buildHook(200), {
        tokens: lengthEstimator(),
        instructions: 'i'.repeat(170),
      })(conversation),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('trims once per model turn and leaves ordinary calls untouched', () => {
    const hook = buildHook(100);
    const context = RunContext.create();

    getTransform(hook, { tokens: lengthEstimator() }, context);

    expect(retryTransform(hook, context)).toBeUndefined();
  });
});

describe('ContextBudgetHookFactory calibration', () => {
  it('logs the estimate next to the provider count after a call', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const tokens = lengthEstimator();
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    getTransform(
      hook,
      { tokens, instructions: 'i'.repeat(10) },
      context,
    )(conversation);

    hook.afterModelCall!({
      modelCallId: 'call-1',
      context,
      model: { name: 'mock', stream: jest.fn(), tokens },
      outcome: {
        type: 'accepted',
        usage: { inputTokens: 120, cacheReadInputTokens: 30 },
      },
    } as never);

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'anthropic',
        exactTokenizer: false,
        estimatedInputTokens: 130,
        reportedInputTokens: 150,
        reportedToEstimatedRatio: 1.154,
      }),
      expect.any(String),
    );
    log.mockRestore();
  });

  it('logs nothing when the provider reported no usage', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    getTransform(hook, { tokens: lengthEstimator() }, context)(conversation);

    hook.afterModelCall!({
      modelCallId: 'call-1',
      context,
      model: { name: 'mock', stream: jest.fn() },
      outcome: {
        type: 'provider_failure',
        usage: {},
        providerFailure: { kind: 'server', stage: 'stream_establishment' },
      },
    } as never);

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('ContextBudgetHookFactory after the provider rejects a request as too long', () => {
  const tokens = lengthEstimator();

  it.each([
    ['by the reported overflow', 200, 20],
    [
      'by a turn even when the rejected request sat well under the budget',
      400,
      5,
    ],
    [
      'down to the latest turn when the older turns are smaller than the reduction',
      200,
      70,
    ],
  ])(
    'trims more history before the retry %s',
    (_, contextWindowTokens, contextOverflowTokens) => {
      const hook = buildHook(contextWindowTokens);
      const context = RunContext.create();
      expect(getTransform(hook, { tokens }, context)(conversation)).toEqual(
        conversation,
      );

      rejectAsTooLong(hook, context, { contextOverflowTokens });

      expect(retryTransform(hook, context, tokens)!(conversation)).toEqual(
        conversation.slice(2),
      );
    },
  );

  it('falls back to a fixed reduction when the rejection reports no counts', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const request = { tokens, instructions: 'i'.repeat(50) };
    expect(getTransform(hook, request, context)(conversation)).toEqual(
      conversation,
    );

    rejectAsTooLong(hook, context, {});

    expect(retryTransform(hook, context, tokens)!(conversation)).toEqual(
      conversation.slice(2),
    );
  });

  it('trims every later call of the same turn, not only the next one', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokens }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
    retryTransform(hook, context, tokens);

    expect(retryTransform(hook, context, tokens)!(conversation)).toEqual(
      conversation.slice(2),
    );
  });

  it('keeps the reduction for the later turns of the run', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokens }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
    retryTransform(hook, context, tokens);

    expect(getTransform(hook, { tokens }, context)(conversation)).toEqual(
      conversation.slice(2),
    );
    expect(retryTransform(hook, context, tokens)).toBeUndefined();
  });

  it('resends the latest turn on a later call of the same turn after the fallback', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokens }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 70 });
    expect(retryTransform(hook, context, tokens)!(conversation)).toEqual(
      conversation.slice(2),
    );

    expect(retryTransform(hook, context, tokens)!(conversation)).toEqual(
      conversation.slice(2),
    );
  });

  it('fails explicitly instead of resending a rejected single turn', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const latestTurn = conversation.slice(2);
    expect(getTransform(hook, { tokens }, context)(latestTurn)).toEqual(
      latestTurn,
    );

    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });

    expect(() => retryTransform(hook, context, tokens)!(latestTurn)).toThrow(
      expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }),
    );
  });

  it('ignores rejections for other reasons', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokens }, context);

    rejectAsTooLong(hook, context, { rejectionReason: 'content_filter' });

    expect(retryTransform(hook, context, tokens)).toBeUndefined();
  });
});

function rejectAsTooLong(
  hook: BudgetHook,
  context: RunContext,
  failure: Record<string, unknown>,
): void {
  hook.afterModelCall!({
    modelCallId: 'call-1',
    context,
    model: { name: 'mock', stream: jest.fn() },
    outcome: {
      type: 'provider_failure',
      usage: {},
      providerFailure: {
        kind: 'rejection',
        stage: 'stream_establishment',
        upstreamStatus: 400,
        rejectionReason: 'context_length_exceeded',
        ...failure,
      },
    },
  } as never);
}

function retryTransform(
  hook: BudgetHook,
  context: RunContext,
  tokens?: TokenEstimator,
): Transform | undefined {
  const transformMessages = jest.fn();
  hook.beforeModelCall!({
    transformMessages,
    context,
    model: { name: 'mock', stream: jest.fn(), tokens },
  } as never);
  return transformMessages.mock.calls[0]?.[0] as Transform | undefined;
}
