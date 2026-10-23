import {
  MockProvider,
  ModelProviderError,
  run,
  textTurn,
  type ModelProvider,
  type ProviderChunk,
  type RunEvent,
} from '@ayunis/agent-runtime';
import type { TokenEstimator } from '@ayunis/inference';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { UsageHookFactory } from './usage-hook.factory';

async function collectEvents(
  events: AsyncIterable<RunEvent>,
): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

function providerWithCalls(calls: readonly ProviderChunk[][]): ModelProvider {
  let callIndex = 0;
  return {
    name: 'runtime-resolved-provider',
    async *stream() {
      const chunks = calls[callIndex] ?? [];
      callIndex += 1;
      for (const chunk of chunks) yield chunk;
    },
  };
}

const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'When does the office open?' }],
  },
];

const catalogModel = {
  name: 'mistral-large-4',
  provider: 'mistral',
  consumesCredits: true,
} as LanguageModel;
const freeCatalogModel = {
  name: 'Open Municipal Assistant',
  consumesCredits: false,
} as LanguageModel;

// One token per word and per message keeps the expected estimates readable.
const wordEstimator: TokenEstimator = {
  exact: true,
  tokensPerMessage: 1,
  tokensPerImage: 0,
  countText: (text) => text.split(/\s+/).filter(Boolean).length,
  countTools: () => 0,
};
const INSTRUCTION_WORDS = 4;
const REQUEST_WORDS = INSTRUCTION_WORDS + 5 + 1;

function rateLimitedOnOpenStream(): ModelProviderError {
  return new ModelProviderError({
    kind: 'rate_limit',
    stage: 'stream_consumption',
    retryAfterMs: 0,
    cause: new Error('token rate limit exceeded'),
  });
}

describe('UsageHookFactory', () => {
  it('records every call outcome with the actual call model and model-call ID', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider = providerWithCalls([
      [
        {
          usage: { cacheReadInputTokens: 7 },
          finishReason: 'stop',
        },
      ],
      [
        {
          textDelta: 'The office opens at 8.',
          usage: {
            inputTokens: 12,
            outputTokens: 6,
            cacheReadInputTokens: 3,
            cacheWriteInputTokens: 2,
          },
          finishReason: 'stop',
        },
      ],
    ]);
    const resolveModel = jest.fn().mockReturnValue(catalogModel);
    const modelCallIds: string[] = [];
    const outcomes: string[] = [];

    await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [
          {
            name: 'capture-model-calls',
            beforeModelCall: (ctx) => {
              modelCallIds.push(ctx.modelCallId);
            },
            afterModelCall: (ctx) => {
              outcomes.push(ctx.outcome.type);
            },
          },
          factory.create({ resolveModel }),
        ],
        retry: { maxRetries: 1 },
      }),
    );

    expect(outcomes).toEqual(['rejected', 'accepted']);
    expect(resolveModel).toHaveBeenCalledTimes(2);
    expect(resolveModel).toHaveBeenNthCalledWith(1, provider);
    expect(resolveModel).toHaveBeenNthCalledWith(2, provider);
    expect(collectCritical).toHaveBeenNthCalledWith(
      1,
      catalogModel,
      7,
      0,
      expect.any(String),
      'agent_runtime',
    );
    expect(collectCritical).toHaveBeenNthCalledWith(
      2,
      catalogModel,
      17,
      6,
      expect.any(String),
      'agent_runtime',
    );
    expect(collectCritical.mock.calls.map((call) => call[3])).toEqual(
      modelCallIds,
    );
  });

  it('records a reported zero-token dimension', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider = new MockProvider([
      textTurn('No additional context was needed.', { inputTokens: 0 }),
    ]);

    await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
      }),
    );

    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      0,
      0,
      expect.any(String),
      'agent_runtime',
    );
  });

  it('fails closed after a paid call emits output without usage', async () => {
    const collectCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider = new MockProvider([textTurn('The office opens at 8.', {})]);

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 2 },
      }),
    );

    expect(provider.requests).toHaveLength(1);
    expect(
      completedEvents
        .filter(
          (event): event is Extract<RunEvent, { type: 'text_delta' }> =>
            event.type === 'text_delta',
        )
        .map((event) => event.delta)
        .join(''),
    ).toBe('The office opens at 8.');
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
    expect(collectCritical).not.toHaveBeenCalled();
  });

  it('blocks retries after a completed paid call reports no usage', async () => {
    const collectCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield { finishReason: 'stop' as const };
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 2 },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
    expect(collectCritical).not.toHaveBeenCalled();
  });

  it('records estimated usage when the run is cancelled after a paid call consumed provider data', async () => {
    const logger = createLoggerMock();
    const controller = new AbortController();
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield {};
      controller.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        signal: controller.signal,
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(completedEvents).not.toContainEqual(
      expect.objectContaining({ type: 'error' }),
    );
    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      REQUEST_WORDS,
      0,
      expect.any(String),
      'agent_runtime',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      {
        execution_path: 'agent_runtime',
        modelCallId: expect.any(String),
        provider: 'mistral',
        model: 'mistral-large-4',
        trigger: 'initial',
        callSequence: 1,
        outcome: 'aborted',
        providerConsumptionStarted: true,
        producedOutput: false,
        estimatedInputTokens: REQUEST_WORDS,
        estimatedOutputTokens: 0,
        exactTokenizer: true,
      },
      'Recorded estimated usage for a model call that ended without reporting usage',
    );
  });

  it('records estimated usage when the consumer leaves a paid stream before its usage chunk', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const outcomes: string[] = [];
    const stream = jest.fn(async function* () {
      yield { textDelta: 'The office opens' };
      yield { textDelta: ' at 8.' };
      await new Promise(() => undefined);
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      stream,
    };
    const leaveAfterFirstDelta = async (): Promise<void> => {
      for await (const event of run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [
          {
            name: 'capture-outcomes',
            afterModelCall: (ctx) => {
              outcomes.push(ctx.outcome.type);
            },
          },
          factory.create({ resolveModel: () => catalogModel }),
        ],
      })) {
        if (event.type === 'text_delta') break;
      }
    };

    await expect(leaveAfterFirstDelta()).resolves.toBeUndefined();

    expect(outcomes).toEqual(['consumer_abandoned']);
    expect(collectCritical).toHaveBeenCalledTimes(1);
    const [, inputTokens, outputTokens] = collectCritical.mock.calls[0] as [
      LanguageModel,
      number,
      number,
    ];
    expect(inputTokens).toBe(REQUEST_WORDS);
    expect(outputTokens).toBeGreaterThan(0);
  });

  it('estimates input from the request as sent, after earlier hooks changed it', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      async *stream() {
        yield { textDelta: 'Das Bürgerbüro öffnet' };
        throw new ModelProviderError({
          kind: 'connection',
          stage: 'stream_consumption',
          cause: new Error('socket hang up'),
        });
      },
    };

    await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [
          {
            name: 'drop-history',
            beforeModelCall: (ctx) => {
              ctx.transformMessages(() => []);
            },
          },
          factory.create({ resolveModel: () => catalogModel }),
        ],
        retry: { maxRetries: 0 },
      }),
    );

    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      INSTRUCTION_WORDS,
      3,
      expect.any(String),
      'agent_runtime',
    );
  });

  it('still records usage reported before the consumer left the stream', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      async *stream() {
        yield { usage: { inputTokens: 12 } };
        yield { textDelta: 'The office opens' };
        await new Promise(() => undefined);
      },
    };

    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages,
      hooks: [factory.create({ resolveModel: () => catalogModel })],
    })) {
      if (event.type === 'text_delta') break;
    }

    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      12,
      0,
      expect.any(String),
      'agent_runtime',
    );
  });

  it('blocks retries after hidden paid output arrives without usage', async () => {
    const collectCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield {
        toolCallDeltas: [
          {
            index: 0,
            id: 'lookup-1',
            name: 'lookup_permit',
            argumentsDelta: '{',
          },
        ],
        finishReason: 'stop' as const,
      };
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 2 },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
    expect(collectCritical).not.toHaveBeenCalled();
  });

  it('retries a paid call the provider rate-limited on an open stream without billing it', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest
      .fn()
      .mockImplementationOnce(async function* () {
        yield* [];
        throw rateLimitedOnOpenStream();
      })
      .mockImplementationOnce(async function* () {
        yield {
          textDelta: 'The office opens at 8.',
          usage: { inputTokens: 12, outputTokens: 6 },
          finishReason: 'stop' as const,
        };
      });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 1 },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(2);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectCritical).toHaveBeenCalledTimes(1);
    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      12,
      6,
      expect.any(String),
      'agent_runtime',
    );
  });

  it('surfaces an exhausted rate limit as a provider failure, not an accounting failure', async () => {
    const collectCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      async *stream() {
        yield* [];
        throw rateLimitedOnOpenStream();
      },
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 0 },
      }),
    );

    expect(completedEvents).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'PROVIDER_FAILED' }),
    );
    expect(completedEvents).not.toContainEqual(
      expect.objectContaining({ type: 'error', code: 'HOOK_FAILED' }),
    );
    expect(collectCritical).not.toHaveBeenCalled();
  });

  it('records estimated usage when a paid stream breaks after visible output', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield { textDelta: 'Das Bürgerbüro öffnet' };
      throw new ModelProviderError({
        kind: 'connection',
        stage: 'stream_consumption',
        cause: new Error('socket hang up'),
      });
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 2 },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      REQUEST_WORDS,
      3,
      expect.any(String),
      'agent_runtime',
    );
    expect(completedEvents).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'PROVIDER_FAILED' }),
    );
    expect(completedEvents).not.toContainEqual(
      expect.objectContaining({ type: 'error', code: 'HOOK_FAILED' }),
    );
  });

  it('counts a tool call the provider was still streaming toward estimated output', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      async *stream() {
        yield { textDelta: 'Checking the permit.' };
        yield {
          toolCallDeltas: [
            {
              index: 0,
              id: 'lookup-1',
              name: 'lookup_permit',
              argumentsDelta: '{"parcel": "Hauptstraße 4',
            },
          ],
        };
        throw new ModelProviderError({
          kind: 'connection',
          stage: 'stream_consumption',
          cause: new Error('socket hang up'),
        });
      },
    };

    await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 0 },
      }),
    );

    expect(collectCritical).toHaveBeenCalledWith(
      catalogModel,
      REQUEST_WORDS,
      3 + 4,
      expect.any(String),
      'agent_runtime',
    );
  });

  it('bills each attempt by estimate when a paid stream breaks before showing output', async () => {
    const collectCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest
      .fn()
      .mockImplementationOnce(async function* () {
        yield {};
        throw new ModelProviderError({
          kind: 'server',
          stage: 'stream_consumption',
          cause: new Error('upstream stream failed'),
        });
      })
      .mockImplementationOnce(async function* () {
        yield {
          textDelta: 'The office opens at 8.',
          usage: { inputTokens: 12, outputTokens: 6 },
          finishReason: 'stop' as const,
        };
      });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 1, backoff: { initialDelayMs: 0 } },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(2);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectCritical.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [REQUEST_WORDS, 0],
      [12, 6],
    ]);
  });

  it('fails closed when estimated usage cannot be persisted', async () => {
    const collectCritical = jest
      .fn()
      .mockRejectedValue(new Error('Usage database unavailable'));
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield { textDelta: 'Das Bürgerbüro öffnet' };
      throw new ModelProviderError({
        kind: 'connection',
        stage: 'stream_consumption',
        cause: new Error('socket hang up'),
      });
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      tokenEstimator: wordEstimator,
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 2, backoff: { initialDelayMs: 0 } },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(completedEvents).toContainEqual(
      expect.objectContaining({
        type: 'error',
        code: 'HOOK_FAILED',
        details: expect.objectContaining({ hookName: 'ayunis-usage' }),
      }),
    );
  });

  it('allows free-model output without usage', async () => {
    const collectCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const provider = new MockProvider([textTurn('The office opens at 8.', {})]);

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => freeCatalogModel })],
      }),
    );

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectCritical).not.toHaveBeenCalled();
  });

  it('blocks retry when critical usage persistence fails', async () => {
    const persistenceError = new Error('Usage database unavailable');
    const collectCritical = jest.fn().mockRejectedValue(persistenceError);
    const factory = new UsageHookFactory({
      collectCritical,
    } as unknown as CollectUsageAsyncService);
    const stream = jest.fn(async function* () {
      yield {
        usage: { inputTokens: 12 },
        finishReason: 'stop' as const,
      };
    });
    const provider: ModelProvider = {
      name: 'runtime-resolved-provider',
      stream,
    };

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
        retry: { maxRetries: 1 },
      }),
    );

    expect(stream).toHaveBeenCalledTimes(1);
    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
  });
});
