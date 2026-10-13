import {
  RunContext,
  type Message,
  type TokenEstimator,
  type Tool,
} from '@ayunis/agent-runtime';
import {
  turnContext,
  callContext,
  afterCallContext,
  callOutcome,
} from 'src/domain/runs/testing/runtime-hook-context.fixture';
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

/** Counts every text and every tool set as a fixed number of tokenEstimator. */
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
  tokenEstimator?: TokenEstimator;
}

function buildHook(contextWindowTokens: number): BudgetHook {
  return new ContextBudgetHookFactory().create({
    model: {
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
  hook.beforeModelTurn!(
    turnContext({
      transformMessages,
      context,
      model: {
        name: 'mock',
        stream: jest.fn(),
        tokenEstimator: request.tokenEstimator,
      },
      instructions: request.instructions ?? '',
      tools: request.tools ?? [],
    }),
  );
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
      tokenEstimator: fixedEstimator(30),
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
      tokenEstimator: fixedEstimator(20),
    })(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('fails explicitly when the latest complete turn exceeds the budget', () => {
    const messages = [
      textMessage('user', 'question'),
      textMessage('assistant', 'answer'),
    ];

    expect(() =>
      getTransform(buildHook(56), { tokenEstimator: fixedEstimator(30) })(
        messages,
      ),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('fails explicitly when there is no user turn', () => {
    expect(() =>
      getTransform(buildHook(100), { tokenEstimator: fixedEstimator(20) })([
        textMessage('assistant', 'orphan'),
      ]),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('keeps the whole conversation when it fits next to the request parts', () => {
    expect(
      getTransform(buildHook(200), { tokenEstimator: lengthEstimator() })(
        conversation,
      ),
    ).toEqual(conversation);
  });

  it('leaves room for the instructions sent with every model call', () => {
    const trimmed = getTransform(buildHook(200), {
      tokenEstimator: lengthEstimator(),
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
      tokenEstimator: lengthEstimator(),
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
      tokenEstimator: lengthEstimator(),
    })(messages);

    expect(trimmed).toEqual(messages.slice(2));
  });

  it('counts per-message framing for providers that report it', () => {
    const framed: TokenEstimator = {
      ...lengthEstimator(true),
      tokensPerMessage: 5,
    };

    const trimmed = getTransform(buildHook(140), { tokenEstimator: framed })(
      conversation,
    );

    expect(trimmed).toEqual(conversation.slice(2));
  });

  it('gives an exact tokenizer less headroom than the shared estimate', () => {
    const estimated = getTransform(buildHook(200), {
      tokenEstimator: lengthEstimator(false),
      instructions: 'i'.repeat(65),
    })(conversation);
    const exact = getTransform(buildHook(200), {
      tokenEstimator: lengthEstimator(true),
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
        tokenEstimator: lengthEstimator(),
        instructions: 'i'.repeat(170),
      })(conversation),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('preserves an ordinary call that already fits', () => {
    const hook = buildHook(100);
    const context = RunContext.create();

    getTransform(hook, { tokenEstimator: lengthEstimator() }, context);

    expect(
      retryTransform(hook, context, lengthEstimator())!(conversation.slice(2)),
    ).toEqual(conversation.slice(2));
  });
});

describe('ContextBudgetHookFactory after the provider rejects a request as too long', () => {
  const tokenEstimator = lengthEstimator();

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
      expect(
        getTransform(hook, { tokenEstimator }, context)(conversation),
      ).toEqual(conversation);

      rejectAsTooLong(hook, context, { contextOverflowTokens });

      expect(
        retryTransform(hook, context, tokenEstimator)!(conversation),
      ).toEqual(conversation.slice(2));
    },
  );

  it('falls back to a fixed reduction when the rejection reports no counts', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const request = { tokenEstimator, instructions: 'i'.repeat(50) };
    expect(getTransform(hook, request, context)(conversation)).toEqual(
      conversation,
    );

    rejectAsTooLong(hook, context, {});

    expect(
      retryTransform(hook, context, tokenEstimator, request.instructions)!(
        conversation,
      ),
    ).toEqual(conversation.slice(2));
  });

  it('trims every later call of the same turn, not only the next one', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokenEstimator }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
    retryTransform(hook, context, tokenEstimator);

    expect(
      retryTransform(hook, context, tokenEstimator)!(conversation),
    ).toEqual(conversation.slice(2));
  });

  it('keeps the reduction for the later turns of the run', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokenEstimator }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
    retryTransform(hook, context, tokenEstimator);

    expect(
      getTransform(hook, { tokenEstimator }, context)(conversation),
    ).toEqual(conversation.slice(2));
    expect(
      retryTransform(hook, context, tokenEstimator)!(conversation),
    ).toEqual(conversation.slice(2));
  });

  it('resends the latest turn on a later call of the same turn after the fallback', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokenEstimator }, context)(conversation);
    rejectAsTooLong(hook, context, { contextOverflowTokens: 70 });
    expect(
      retryTransform(hook, context, tokenEstimator)!(conversation),
    ).toEqual(conversation.slice(2));

    expect(
      retryTransform(hook, context, tokenEstimator)!(conversation),
    ).toEqual(conversation.slice(2));
  });

  it('fails explicitly instead of resending a rejected single turn', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    const latestTurn = conversation.slice(2);
    expect(getTransform(hook, { tokenEstimator }, context)(latestTurn)).toEqual(
      latestTurn,
    );

    rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });

    expect(() =>
      retryTransform(hook, context, tokenEstimator)!(latestTurn),
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
  });

  it('ignores rejections for other reasons', () => {
    const hook = buildHook(200);
    const context = RunContext.create();
    getTransform(hook, { tokenEstimator }, context);

    rejectAsTooLong(hook, context, { rejectionReason: 'content_filter' });

    expect(
      retryTransform(hook, context, tokenEstimator)!(conversation),
    ).toEqual(conversation);
  });
});

function rejectAsTooLong(
  hook: BudgetHook,
  context: RunContext,
  failure: Record<string, unknown>,
): void {
  hook.afterModelCall!(
    afterCallContext({
      context,
      outcome: callOutcome({
        failure: {
          kind: 'rejection',
          stage: 'stream_establishment',
          upstreamStatus: 400,
          rejectionReason: 'context_length_exceeded',
          ...failure,
        },
      }),
    }),
  );
}

function retryTransform(
  hook: BudgetHook,
  context: RunContext,
  tokenEstimator?: TokenEstimator,
  instructions = '',
): Transform | undefined {
  const transformMessages = jest.fn();
  hook.beforeModelCall!(
    callContext({
      request: { instructions, messages: [], tools: [] },
      transformMessages,
      context,
      model: { name: 'mock', stream: jest.fn(), tokenEstimator },
    }),
  );
  return transformMessages.mock.calls[0]?.[0] as Transform | undefined;
}

it('does not reuse a previous turn rejection to bypass the retained reduction', () => {
  const hook = buildHook(200);
  const context = RunContext.create();
  const tokenEstimator = lengthEstimator();
  getTransform(hook, { tokenEstimator }, context)(conversation);
  rejectAsTooLong(hook, context, { contextOverflowTokens: 70 });
  retryTransform(hook, context, tokenEstimator)!(conversation);
  expect(() =>
    getTransform(
      hook,
      { tokenEstimator },
      context,
    )([textMessage('user', 'x'.repeat(110))]),
  ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
});

it('tightens again after repeated context rejection and stops before resending the latest turn', () => {
  const hook = buildHook(200);
  const context = RunContext.create();
  const tokenEstimator = lengthEstimator();
  getTransform(hook, { tokenEstimator }, context)(conversation);
  rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
  retryTransform(hook, context, tokenEstimator)!(conversation);
  rejectAsTooLong(hook, context, { contextOverflowTokens: 20 });
  expect(() =>
    retryTransform(hook, context, tokenEstimator)!(conversation),
  ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
});
it('prices the actual recovery instructions before the provider call', () => {
  const hook = buildHook(200);
  const context = RunContext.create();
  const tokenEstimator = lengthEstimator();
  getTransform(hook, { tokenEstimator }, context)(conversation);
  expect(
    retryTransform(hook, context, tokenEstimator, 'i'.repeat(70))!(
      conversation,
    ),
  ).toEqual(conversation.slice(2));
});
it('does not reuse the fallback when a later tool turn grows beyond the retained budget', () => {
  const hook = buildHook(200);
  const context = RunContext.create();
  const tokenEstimator = lengthEstimator();
  getTransform(hook, { tokenEstimator }, context)(conversation);
  rejectAsTooLong(hook, context, { contextOverflowTokens: 70 });
  const latest = retryTransform(hook, context, tokenEstimator)!(conversation);
  expect(() =>
    getTransform(
      hook,
      { tokenEstimator },
      context,
    )([
      ...latest,
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call-1',
            toolName: 'search',
            result: 'result'.repeat(20),
          },
        ],
      },
    ]),
  ).toThrow(expect.objectContaining({ code: 'CONTEXT_BUDGET_EXCEEDED' }));
});
