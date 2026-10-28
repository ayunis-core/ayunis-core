import { ModelProviderError } from '@ayunis/inference';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RunEvent } from '../contracts/event';
import type { Hook, ModelCallOutcome } from '../contracts/hook';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
  Usage,
} from '../contracts/provider';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import {
  baseInput,
  collectEvents,
  echoTool,
  userMessage,
} from './test-helpers';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('focused runtime contract coverage', () => {
  it('retries a pre-output failure after a beforeModelCall custom event', async () => {
    let providerCalls = 0;
    const model: ModelProvider = {
      name: 'custom-event-retry',
      stream() {
        providerCalls += 1;
        if (providerCalls === 1) {
          throw new ModelProviderError({
            kind: 'connection',
            stage: 'stream_establishment',
            cause: new Error('offline'),
          });
        }
        return chunks(textTurn('Recovered'));
      },
    };
    const hook: Hook = {
      name: 'call-start-event',
      beforeModelCall: (ctx) => {
        ctx.emit({
          name: 'call_started',
          data: { sequence: ctx.callSequence },
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [hook],
        retry: {
          maxRetries: 1,
          backoff: { initialDelayMs: 0, jitterRatio: 0 },
        },
      }),
    );

    expect(providerCalls).toBe(2);
    expect(
      events
        .filter((event) => event.type === 'custom')
        .map((event) => event.data),
    ).toEqual([{ sequence: 1 }, { sequence: 2 }]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('keeps parent and child call identities stable with exact usage totals', async () => {
    const parentUsages: Usage[] = [usage(2, 3, 5, 7), usage(11, 13, 17, 19)];
    const childUsage = usage(23, 29, 31, 37);
    const parent = namedProvider('parent-provider', [
      toolCallTurn(
        { id: 'spawn-1', name: 'spawn', input: {} },
        parentUsages[0],
      ),
      textTurn('Parent done', parentUsages[1]),
    ]);
    const child = namedProvider('child-provider', [
      textTurn('Child done', childUsage),
    ]);
    const beforeCalls = new Map<
      string,
      { runId: string; provider: string; sequence: number }
    >();
    const afterCalls: Array<{
      modelCallId: string;
      runId: string;
      provider: string;
      usage: Usage;
    }> = [];
    let childRunEnd: Extract<RunEvent, { type: 'run_end' }> | undefined;
    const observer: Hook = {
      name: 'identity-and-usage',
      beforeModelCall: (ctx) => {
        beforeCalls.set(ctx.modelCallId, {
          runId: ctx.runId,
          provider: ctx.model.name,
          sequence: ctx.callSequence,
        });
      },
      afterModelCall: (ctx) => {
        afterCalls.push({
          modelCallId: ctx.modelCallId,
          runId: ctx.runId,
          provider: ctx.model.name,
          usage: ctx.outcome.usage,
        });
      },
    };
    const spawn = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: 'Child',
          model: child,
          messages: [userMessage('Go')],
        })) {
          if (event.type === 'run_end') childRunEnd = event;
        }
        return 'child complete';
      },
    });

    const parentEvents = await collectEvents(
      baseInput(parent, { hooks: [observer], tools: [spawn] }),
    );

    expect(afterCalls).toEqual([
      expect.objectContaining({
        provider: 'parent-provider',
        usage: parentUsages[0],
      }),
      expect.objectContaining({
        provider: 'child-provider',
        usage: childUsage,
      }),
      expect.objectContaining({
        provider: 'parent-provider',
        usage: parentUsages[1],
      }),
    ]);
    expect(new Set(afterCalls.map((call) => call.modelCallId)).size).toBe(3);
    for (const call of afterCalls) {
      expect(beforeCalls.get(call.modelCallId)).toMatchObject({
        runId: call.runId,
        provider: call.provider,
      });
    }
    const parentRunIds = afterCalls
      .filter((call) => call.provider === 'parent-provider')
      .map((call) => call.runId);
    const childCall = afterCalls.find(
      (call) => call.provider === 'child-provider',
    );
    expect(new Set(parentRunIds).size).toBe(1);
    expect(childCall?.runId).not.toBe(parentRunIds[0]);
    expect(childRunEnd).toMatchObject({ type: 'run_end', usage: childUsage });
    expect(parentEvents.at(-1)).toMatchObject({
      type: 'run_end',
      usage: usage(13, 16, 22, 26),
    });
  });

  it('deeply inherits child retry fields while applying nested overrides', async () => {
    vi.useFakeTimers();
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((values) => {
      if (values instanceof Uint32Array) values[0] = 0xffff_ffff;
      return values;
    });
    let childCalls = 0;
    const child: ModelProvider = {
      name: 'inherited-policy-child',
      stream() {
        childCalls += 1;
        if (childCalls <= 2) {
          throw new ModelProviderError({
            kind: 'rejection',
            stage: 'stream_establishment',
            retryAfterMs: 700,
            cause: new Error('temporarily rejected'),
          });
        }
        return chunks(textTurn('Recovered'));
      },
    };
    const childStatuses: string[] = [];
    const spawn = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: 'Child',
          model: child,
          messages: [userMessage('Go')],
          retry: {
            backoff: { initialDelayMs: 100 },
            retryAfter: { maxWaitMs: 800 },
          },
        })) {
          if (event.type === 'run_end') childStatuses.push(event.status);
        }
        return 'child complete';
      },
    });
    const parent = new MockProvider([
      toolCallTurn({ id: 'spawn-1', name: 'spawn', input: {} }),
      textTurn('Parent done'),
    ]);

    const pending = collectEvents(
      baseInput(parent, {
        tools: [spawn],
        retry: {
          maxRetries: 2,
          retryableProviderFailureKinds: ['rejection'],
          backoff: {
            initialDelayMs: 10,
            multiplier: 3,
            maxDelayMs: 250,
            jitterRatio: 0.5,
          },
          retryAfter: {
            precedence: 'backoff',
            maxWaitMs: 500,
          },
        },
      }),
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(childCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(149);
    expect(childCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(childCalls).toBe(2);
    await vi.advanceTimersByTimeAsync(374);
    expect(childCalls).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(childCalls).toBe(3);
    await pending;
    expect(childStatuses).toEqual(['completed']);
  });

  it('reports invalid_fallback explicitly when a fallback calls a tool', async () => {
    const outcomes: Array<
      Pick<
        ModelCallOutcome,
        | 'type'
        | 'trigger'
        | 'providerConsumptionStarted'
        | 'producedOutput'
        | 'visibleOutput'
      > & { reason?: string }
    > = [];
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'broken-1',
              name: 'echo',
              argumentsDelta: '{"value":',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      toolCallTurn({ id: 'fallback-tool', name: 'echo', input: {} }),
    ]);
    const observer: Hook = {
      name: 'outcome-observer',
      afterModelCall: (ctx) => {
        outcomes.push({
          type: ctx.outcome.type,
          trigger: ctx.outcome.trigger,
          providerConsumptionStarted: ctx.outcome.providerConsumptionStarted,
          producedOutput: ctx.outcome.producedOutput,
          visibleOutput: ctx.outcome.visibleOutput,
          ...(ctx.outcome.type === 'rejected'
            ? { reason: ctx.outcome.reason }
            : {}),
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [observer],
        tools: [echoTool()],
        retry: { maxRetries: 1 },
      }),
    );

    expect(outcomes).toEqual([
      {
        type: 'rejected',
        trigger: 'initial',
        reason: 'malformed',
        providerConsumptionStarted: true,
        producedOutput: true,
        visibleOutput: false,
      },
      {
        type: 'rejected',
        trigger: 'fallback',
        reason: 'invalid_fallback',
        providerConsumptionStarted: true,
        producedOutput: true,
        visibleOutput: false,
      },
    ]);
    expect(model.requests[1].tools).toEqual([]);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'MALFORMED_TOOL_CALL',
    });
  });
});

const namedProvider = (
  name: string,
  turns: readonly (readonly ProviderChunk[])[],
): ModelProvider => {
  const delegate = new MockProvider(turns);
  return {
    name,
    stream: (request: ProviderRequest) => delegate.stream(request),
  };
};

const chunks = (
  values: readonly ProviderChunk[],
): AsyncIterable<ProviderChunk> => ({
  async *[Symbol.asyncIterator]() {
    for (const value of values) yield value;
  },
});

const usage = (
  inputTokens: number,
  outputTokens: number,
  cacheReadInputTokens: number,
  cacheWriteInputTokens: number,
): Usage => ({
  inputTokens,
  outputTokens,
  cacheReadInputTokens,
  cacheWriteInputTokens,
});
