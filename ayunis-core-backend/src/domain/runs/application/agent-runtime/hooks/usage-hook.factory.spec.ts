import {
  MockProvider,
  run,
  textTurn,
  type ModelProvider,
  type ProviderChunk,
  type RunEvent,
} from '@ayunis/agent-runtime';
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
  name: 'Municipal Assistant',
  consumesCredits: true,
} as LanguageModel;
const freeCatalogModel = {
  name: 'Open Municipal Assistant',
  consumesCredits: false,
} as LanguageModel;

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

  it('fails closed when a paid call consumed provider data before cancellation', async () => {
    const controller = new AbortController();
    const collectCritical = jest.fn();
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
      status: 'error',
    });
    expect(collectCritical).not.toHaveBeenCalled();
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
