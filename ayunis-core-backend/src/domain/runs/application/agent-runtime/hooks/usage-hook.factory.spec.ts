import {
  MockProvider,
  run,
  textTurn,
  type ModelProvider,
  type ProviderChunk,
  type RunEvent,
} from '@ayunis/agent-runtime';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
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

const catalogModel = { name: 'Municipal Assistant' } as LanguageModel;

describe('UsageHookFactory', () => {
  it('records every call outcome with the actual call model and model-call ID', async () => {
    const collectUsageCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectUsageCritical,
    } as unknown as InferenceUsageGuard);
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
    expect(collectUsageCritical).toHaveBeenNthCalledWith(
      1,
      catalogModel,
      { inputTokens: 7, outputTokens: 0 },
      expect.any(String),
      'agent_runtime',
    );
    expect(collectUsageCritical).toHaveBeenNthCalledWith(
      2,
      catalogModel,
      { inputTokens: 17, outputTokens: 6 },
      expect.any(String),
      'agent_runtime',
    );
    expect(collectUsageCritical.mock.calls.map((call) => call[2])).toEqual(
      modelCallIds,
    );
  });

  it('records a reported zero-token dimension', async () => {
    const collectUsageCritical = jest.fn().mockResolvedValue(undefined);
    const factory = new UsageHookFactory({
      collectUsageCritical,
    } as unknown as InferenceUsageGuard);
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

    expect(collectUsageCritical).toHaveBeenCalledWith(
      catalogModel,
      { inputTokens: 0, outputTokens: 0 },
      expect.any(String),
      'agent_runtime',
    );
  });

  it('does not record usage when the provider reports no token fields', async () => {
    const collectUsageCritical = jest.fn();
    const factory = new UsageHookFactory({
      collectUsageCritical,
    } as unknown as InferenceUsageGuard);
    const provider = new MockProvider([textTurn('The office opens at 8.', {})]);

    const completedEvents = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [factory.create({ resolveModel: () => catalogModel })],
      }),
    );

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectUsageCritical).not.toHaveBeenCalled();
  });

  it('blocks retry when critical usage persistence fails', async () => {
    const persistenceError = new Error('Usage database unavailable');
    const collectUsageCritical = jest.fn().mockRejectedValue(persistenceError);
    const factory = new UsageHookFactory({
      collectUsageCritical,
    } as unknown as InferenceUsageGuard);
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
