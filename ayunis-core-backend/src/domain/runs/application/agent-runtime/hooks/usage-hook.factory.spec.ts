import {
  MockProvider,
  run,
  textTurn,
  toolCallTurn,
} from '@ayunis/agent-runtime';
import type { RunEvent } from '@ayunis/agent-runtime';
import type { ModelProvider } from '@ayunis/inference';
import { randomUUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { UserCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { UsageHookFactory } from './usage-hook.factory';

const makeGuard = (
  overrides: Partial<jest.Mocked<InferenceUsageGuard>> = {},
): jest.Mocked<InferenceUsageGuard> =>
  ({
    authorizeModelCall: jest.fn().mockResolvedValue(null),
    releaseCreditReservation: jest.fn().mockResolvedValue(undefined),
    collectUsageAndWait: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as jest.Mocked<InferenceUsageGuard>;

describe('UsageHookFactory', () => {
  it('marks interrupted usage accounting as critical', () => {
    const hook = new UsageHookFactory(makeGuard()).create({
      model: { name: 'paid-assistant' } as LanguageModel,
      principal: { userId: randomUUID(), orgId: randomUUID() },
    });

    expect(hook.modelCallInterruptedFailureMode).toBe('critical');
  });

  it('attributes reported usage to the agent-runtime path', async () => {
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const authorizeModelCall = jest.fn().mockResolvedValue(null);
    const factory = new UsageHookFactory(
      makeGuard({
        collectUsageAndWait,
        authorizeModelCall,
      }),
    );
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: new MockProvider([
        textTurn('The office opens at 8.', {
          inputTokens: 12,
          outputTokens: 6,
        }),
      ]),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'When does the office open?' }],
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(completedEvents).not.toHaveLength(0);
    expect(collectUsageAndWait).toHaveBeenCalledWith(
      model,
      { inputTokens: 12, outputTokens: 6 },
      expect.any(String),
      'agent_runtime',
    );
    expect(authorizeModelCall).toHaveBeenCalledTimes(1);
  });

  it('caps the provider call and releases its reservation after accounting', async () => {
    const reservationId = randomUUID();
    const authorizeModelCall = jest.fn().mockResolvedValue({
      reservationId,
      maxOutputTokens: 750,
    });
    const releaseCreditReservation = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({ authorizeModelCall, releaseCreditReservation }),
    );
    const provider = new MockProvider([textTurn('Bounded answer')]);

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Explain the legal position.' }],
        },
      ],
      hooks: [
        factory.create({
          model: { name: 'paid-assistant' } as LanguageModel,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({ type: 'run_end' });
    expect(provider.requests[0].maxOutputTokens).toBe(750);
    expect(releaseCreditReservation).toHaveBeenCalledWith(reservationId);
  });

  it('releases a reservation when cancellation wins before the provider starts', async () => {
    const controller = new AbortController();
    const reservationId = randomUUID();
    const authorizeModelCall = jest.fn().mockImplementation(async () => {
      controller.abort();
      return { reservationId, maxOutputTokens: 750 };
    });
    const releaseCreditReservation = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({ authorizeModelCall, releaseCreditReservation }),
    );
    const provider = new MockProvider([textTurn('never')]);

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Explain the legal position.' }],
        },
      ],
      signal: controller.signal,
      hooks: [
        factory.create({
          model: { name: 'paid-assistant' } as LanguageModel,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(provider.requests).toHaveLength(0);
    expect(releaseCreditReservation).toHaveBeenCalledWith(reservationId);
  });

  it('retries reservation release during run finalization after a delete failure', async () => {
    const reservationId = randomUUID();
    const releaseCreditReservation = jest
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall: jest.fn().mockResolvedValue({
          reservationId,
          maxOutputTokens: 750,
        }),
        releaseCreditReservation,
      }),
    );

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: new MockProvider([textTurn('Bounded answer')]),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Explain the legal position.' }],
        },
      ],
      hooks: [
        factory.create({
          model: { name: 'paid-assistant' } as LanguageModel,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(completedEvents.filter((event) => event.type === 'error')).toEqual(
      [],
    );
    expect(releaseCreditReservation).toHaveBeenCalledTimes(2);
    expect(releaseCreditReservation).toHaveBeenNthCalledWith(2, reservationId);
  });

  it('accounts for a rejected provider attempt before retrying', async () => {
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(makeGuard({ collectUsageAndWait }));
    const model = {
      name: 'paid-assistant',
      consumesCredits: true,
    } as LanguageModel;
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'broken-call',
              name: 'search_registry',
              argumentsDelta: '{"query":',
            },
          ],
        },
        {
          finishReason: 'tool_calls',
          usage: { inputTokens: 40, outputTokens: 8 },
        },
      ],
      textTurn('Recovered', { inputTokens: 45, outputTokens: 3 }),
    ]);

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Search the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({ type: 'run_end' });
    expect(provider.requests).toHaveLength(2);
    expect(collectUsageAndWait).toHaveBeenNthCalledWith(
      1,
      model,
      { inputTokens: 40, outputTokens: 8 },
      expect.any(String),
      'agent_runtime',
    );
    expect(collectUsageAndWait).toHaveBeenNthCalledWith(
      2,
      model,
      { inputTokens: 45, outputTokens: 3 },
      expect.any(String),
      'agent_runtime',
    );
  });

  it('retains a failed release across a separately reserved transport retry', async () => {
    const firstReservationId = randomUUID();
    const secondReservationId = randomUUID();
    const authorizeModelCall = jest
      .fn()
      .mockResolvedValueOnce({
        reservationId: firstReservationId,
        maxOutputTokens: 500,
      })
      .mockResolvedValueOnce({
        reservationId: secondReservationId,
        maxOutputTokens: 500,
      });
    const releaseCreditReservation = jest
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValue(undefined);
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall,
        releaseCreditReservation,
        collectUsageAndWait,
      }),
    );
    let attempt = 0;
    const provider: ModelProvider = {
      name: 'metered-retry-provider',
      prepareRetry: async ({ attempt: failedAttempt }) => failedAttempt === 1,
      async *stream() {
        attempt++;
        if (attempt === 1) {
          yield { usage: { inputTokens: 30, outputTokens: 0 } };
          throw new Error('transient provider failure');
        }
        yield {
          textDelta: 'Recovered',
          usage: { inputTokens: 32, outputTokens: 4 },
        };
      },
    };
    const model = {
      name: 'paid-assistant',
      consumesCredits: true,
    } as LanguageModel;

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Explain the legal position.' }],
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.filter((event) => event.type === 'error')).toEqual(
      [],
    );
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(authorizeModelCall).toHaveBeenCalledTimes(2);
    expect(releaseCreditReservation).toHaveBeenCalledTimes(3);
    expect(releaseCreditReservation).toHaveBeenNthCalledWith(
      1,
      firstReservationId,
    );
    expect(releaseCreditReservation).toHaveBeenNthCalledWith(
      2,
      secondReservationId,
    );
    expect(releaseCreditReservation).toHaveBeenNthCalledWith(
      3,
      firstReservationId,
    );
    expect(collectUsageAndWait).toHaveBeenNthCalledWith(
      1,
      model,
      { inputTokens: 30, outputTokens: 0 },
      expect.any(String),
      'agent_runtime',
    );
    expect(collectUsageAndWait).toHaveBeenNthCalledWith(
      2,
      model,
      { inputTokens: 32, outputTokens: 4 },
      expect.any(String),
      'agent_runtime',
    );
  });

  it('does not record usage when the provider reports no token fields', async () => {
    const collectUsageAndWait = jest.fn();
    const factory = new UsageHookFactory(
      makeGuard({
        collectUsageAndWait,
      }),
    );
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: new MockProvider([textTurn('The office opens at 8.', {})]),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'When does the office open?' }],
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectUsageAndWait).not.toHaveBeenCalled();
  });

  it('fails closed when a paid model call reports no token fields', async () => {
    const reservationId = randomUUID();
    const collectUsageAndWait = jest.fn();
    const releaseCreditReservation = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall: jest.fn().mockResolvedValue({
          reservationId,
          maxOutputTokens: 750,
        }),
        collectUsageAndWait,
        releaseCreditReservation,
      }),
    );
    const model = {
      name: 'paid-municipal-assistant',
      consumesCredits: true,
    } as LanguageModel;
    const provider = new MockProvider([
      toolCallTurn(
        {
          id: 'registry-search',
          name: 'search_registry',
          input: {},
        },
        {},
      ),
      textTurn('The registry result is available.'),
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Research the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(1);
    expect(collectUsageAndWait).not.toHaveBeenCalled();
    expect(releaseCreditReservation).not.toHaveBeenCalled();
    expect(completedEvents).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'USAGE_UNAVAILABLE' }),
    );
  });

  it('fails closed when a rejected paid tool call omits usage', async () => {
    const collectUsageAndWait = jest.fn();
    const factory = new UsageHookFactory(
      makeGuard({
        collectUsageAndWait,
      }),
    );
    const model = {
      name: 'paid-municipal-assistant',
      consumesCredits: true,
    } as LanguageModel;
    const malformedToolTurn = [
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'registry-search',
            name: 'search_registry',
            argumentsDelta: '{"query":',
          },
        ],
      },
      { finishReason: 'tool_calls' as const },
    ];
    const provider = new MockProvider([
      malformedToolTurn,
      malformedToolTurn,
      malformedToolTurn,
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Research the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(1);
    expect(collectUsageAndWait).not.toHaveBeenCalled();
    expect(completedEvents).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'USAGE_UNAVAILABLE' }),
    );
  });

  it('retries an empty paid-model response without reported usage', async () => {
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        collectUsageAndWait,
      }),
    );
    const model = {
      name: 'paid-municipal-assistant',
      consumesCredits: true,
    } as LanguageModel;
    const provider = new MockProvider([
      [],
      textTurn('Recovered answer', { inputTokens: 12, outputTokens: 4 }),
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Question' }],
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(2);
    expect(collectUsageAndWait).toHaveBeenCalledTimes(1);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it.each([
    { usage: { inputTokens: 10_000 }, omitted: 'output' },
    { usage: { outputTokens: 500 }, omitted: 'input' },
  ])(
    'fails closed when paid-model usage omits $omitted accounting',
    async ({ usage }) => {
      const collectUsageAndWait = jest.fn();
      const factory = new UsageHookFactory(
        makeGuard({
          collectUsageAndWait,
        }),
      );
      const model = {
        name: 'paid-municipal-assistant',
        consumesCredits: true,
      } as LanguageModel;
      const events = run({
        instructions: 'Answer municipal service questions.',
        model: new MockProvider([textTurn('Answer', usage)]),
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Question' }],
          },
        ],
        hooks: [
          factory.create({
            model,
            principal: { userId: randomUUID(), orgId: randomUUID() },
          }),
        ],
      });

      const completedEvents: RunEvent[] = [];
      for await (const event of events) completedEvents.push(event);

      expect(collectUsageAndWait).not.toHaveBeenCalled();
      expect(completedEvents).toContainEqual(
        expect.objectContaining({ type: 'error', code: 'USAGE_UNAVAILABLE' }),
      );
    },
  );

  it('blocks another model call after the preceding call exhausts credits', async () => {
    const authorizeModelCall = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(
        new UserCreditLimitExceededError({
          limit: 400_000,
          consumed: 410_000,
        }),
      );
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall,
        collectUsageAndWait,
      }),
    );
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const provider = new MockProvider([
      toolCallTurn(
        { id: 'registry-search', name: 'search_registry', input: {} },
        { inputTokens: 250_000, outputTokens: 500 },
      ),
      textTurn('The registry result is available.'),
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Research the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(1);
    expect(collectUsageAndWait).toHaveBeenCalledTimes(1);
    expect(authorizeModelCall).toHaveBeenCalledTimes(2);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
    expect(completedEvents).toContainEqual(
      expect.objectContaining({
        type: 'error',
        code: 'USER_CREDIT_LIMIT_EXCEEDED',
      }),
    );
  });

  it('fails closed when usage cannot be persisted', async () => {
    const reservationId = randomUUID();
    const authorizeModelCall = jest.fn().mockResolvedValue({
      reservationId,
      maxOutputTokens: 750,
    });
    const releaseCreditReservation = jest.fn().mockResolvedValue(undefined);
    const collectUsageAndWait = jest
      .fn()
      .mockRejectedValue(new Error('Usage database unavailable'));
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall,
        collectUsageAndWait,
        releaseCreditReservation,
      }),
    );
    const provider = new MockProvider([
      toolCallTurn({
        id: 'registry-search',
        name: 'search_registry',
        input: {},
      }),
      textTurn('The registry result is available.'),
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Research the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model: { name: 'municipal-assistant' } as LanguageModel,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(1);
    expect(collectUsageAndWait).toHaveBeenCalledTimes(1);
    expect(authorizeModelCall).toHaveBeenCalledTimes(1);
    expect(releaseCreditReservation).not.toHaveBeenCalled();
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
  });

  it('continues a tool loop while credits remain available', async () => {
    const authorizeModelCall = jest.fn().mockResolvedValue(null);
    const collectUsageAndWait = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory(
      makeGuard({
        authorizeModelCall,
        collectUsageAndWait,
      }),
    );
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const provider = new MockProvider([
      toolCallTurn({
        id: 'registry-search',
        name: 'search_registry',
        input: {},
      }),
      textTurn('The registry result is available.'),
    ]);
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Research the registry.' }],
        },
      ],
      tools: [
        {
          name: 'search_registry',
          description: 'Searches the municipal registry.',
          parameters: { type: 'object', properties: {} },
          execute: () => 'Registry result',
        },
      ],
      hooks: [
        factory.create({
          model,
          principal: { userId: randomUUID(), orgId: randomUUID() },
        }),
      ],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(provider.requests).toHaveLength(2);
    expect(collectUsageAndWait).toHaveBeenCalledTimes(2);
    expect(authorizeModelCall).toHaveBeenCalledTimes(2);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });
});
