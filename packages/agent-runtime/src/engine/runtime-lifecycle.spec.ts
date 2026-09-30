import { ModelProviderError } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import type { RunEvent } from '../contracts/event';
import type {
  Hook,
  ModelCallOutcome,
  ModelCallOutcomeSnapshot,
  ModelCallTrigger,
} from '../contracts/hook';
import type { ModelProvider, ProviderChunk } from '../contracts/provider';
import { MockProvider, textTurn } from '../providers/mock/mock-provider';
import {
  baseInput,
  collectEvents,
  echoTool,
  userMessage,
} from './test-helpers';

describe('model turn and call lifecycle', () => {
  it('runs turn hooks once and call hooks around every recovery call', async () => {
    const phases: string[] = [];
    const calls: Array<{
      id: string;
      sequence: number;
      trigger: ModelCallTrigger;
      outcome: ModelCallOutcome['type'];
    }> = [];
    const hook: Hook = {
      name: 'observer',
      beforeModelTurn: (ctx) => {
        phases.push(`beforeTurn:${ctx.turn}`);
      },
      beforeModelCall: (ctx) => {
        phases.push(`beforeCall:${ctx.callSequence}:${ctx.trigger}`);
      },
      afterModelCall: (ctx) => {
        calls.push({
          id: ctx.modelCallId,
          sequence: ctx.callSequence,
          trigger: ctx.trigger,
          outcome: ctx.outcome.type,
        });
        phases.push(`afterCall:${ctx.callSequence}:${ctx.outcome.type}`);
      },
      afterModelTurn: (ctx) => {
        phases.push(`afterTurn:${ctx.turn}:${ctx.outcome.type}`);
      },
    };
    const model = new MockProvider([[], textTurn('Recovered')]);

    const events = await collectEvents(baseInput(model, { hooks: [hook] }));

    expect(phases).toEqual([
      'beforeTurn:1',
      'beforeCall:1:initial',
      'afterCall:1:rejected',
      'beforeCall:2:empty_recovery',
      'afterCall:2:accepted',
      'afterTurn:1:accepted',
    ]);
    expect(calls.map((call) => call.id)).toHaveLength(2);
    expect(new Set(calls.map((call) => call.id)).size).toBe(2);
    expect(
      events.filter((event) => event.type === 'assistant_message'),
    ).toHaveLength(1);
  });

  it('shares maxRetries across provider, empty, malformed, and fallback calls', async () => {
    const triggers: ModelCallTrigger[] = [];
    let calls = 0;
    const model: ModelProvider = {
      name: 'mixed-recovery',
      stream() {
        calls += 1;
        if (calls === 1) {
          throw new ModelProviderError({
            kind: 'connection',
            stage: 'stream_establishment',
            cause: new Error('connection reset'),
          });
        }
        if (calls === 2) return streamChunks([]);
        if (calls === 3) {
          return streamChunks([
            {
              toolCallDeltas: [
                {
                  index: 0,
                  id: 'bad-call',
                  name: 'echo',
                  argumentsDelta: '{"value":',
                },
              ],
            },
            { finishReason: 'tool_calls' },
          ]);
        }
        return streamChunks(textTurn('Fallback answer'));
      },
    };
    const hook: Hook = {
      name: 'calls',
      beforeModelCall: (ctx) => {
        triggers.push(ctx.trigger);
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [hook],
        tools: [echoTool()],
        retry: {
          maxRetries: 3,
          backoff: { initialDelayMs: 0, jitterRatio: 0 },
        },
      }),
    );

    expect(calls).toBe(4);
    expect(triggers).toEqual([
      'initial',
      'provider_retry',
      'empty_recovery',
      'fallback',
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('preserves every usage dimension per call and in the run aggregate', async () => {
    const outcomes: ModelCallOutcomeSnapshot[] = [];
    const model = new MockProvider([
      [
        {
          finishReason: 'stop',
          usage: {
            inputTokens: 2,
            outputTokens: 0,
            cacheReadInputTokens: 3,
            cacheWriteInputTokens: 5,
          },
        },
      ],
      textTurn('Done', {
        inputTokens: 7,
        outputTokens: 11,
        cacheReadInputTokens: 13,
        cacheWriteInputTokens: 17,
      }),
    ]);
    const hook: Hook = {
      name: 'usage',
      afterModelCall: (ctx) => {
        outcomes.push(ctx.outcome);
      },
    };

    const events = await collectEvents(baseInput(model, { hooks: [hook] }));

    expect(outcomes.map((outcome) => outcome.usage)).toEqual([
      {
        inputTokens: 2,
        outputTokens: 0,
        cacheReadInputTokens: 3,
        cacheWriteInputTokens: 5,
      },
      {
        inputTokens: 7,
        outputTokens: 11,
        cacheReadInputTokens: 13,
        cacheWriteInputTokens: 17,
      },
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      usage: {
        inputTokens: 9,
        outputTokens: 11,
        cacheReadInputTokens: 16,
        cacheWriteInputTokens: 22,
      },
    });
  });

  it('gives every call an isolated immutable sanitized request snapshot', async () => {
    const frozen: boolean[] = [];
    const model = new MockProvider([[], textTurn('Done')]);
    const hook: Hook = {
      name: 'call-local-redaction',
      beforeModelCall: (ctx) => {
        frozen.push(
          Object.isFrozen(ctx.request) &&
            Object.isFrozen(ctx.request.messages) &&
            Object.isFrozen(ctx.request.messages[0].content) &&
            Object.isFrozen(ctx.tools) &&
            Object.isFrozen(ctx.tools[0].parameters),
        );
        ctx.transformMessages((messages) =>
          messages.map((message) => ({
            ...message,
            content: message.content.map((content) =>
              content.type === 'text'
                ? { ...content, text: `${content.text} [call]` }
                : content,
            ),
          })),
        );
      },
    };
    const replayedInput = {
      query: 'budget',
      optionalDate: null,
      nullableNote: null,
    };

    await collectEvents(
      baseInput(model, {
        hooks: [hook],
        messages: [
          userMessage('Hi'),
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'old-call',
                name: 'echo',
                input: replayedInput,
              },
            ],
          },
        ],
        tools: [
          echoTool({
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                optionalDate: { type: 'string' },
                nullableNote: { type: ['string', 'null'] },
              },
            },
          }),
        ],
      }),
    );

    expect(frozen).toEqual([true, true]);
    expect(model.requests).toHaveLength(2);
    for (const request of model.requests) {
      expect(request.instructions).toBe('Be helpful.');
      expect(request.messages[0].content[0]).toMatchObject({
        type: 'text',
        text: 'Hi [call]',
      });
      expect(request.messages[1].content[0]).toMatchObject({
        type: 'tool_use',
        input: { query: 'budget', nullableNote: null },
      });
    }
    expect(replayedInput).toEqual({
      query: 'budget',
      optionalDate: null,
      nullableNote: null,
    });
  });

  it('adds terminal call identity and portable provider facts only to the error event', async () => {
    const model: ModelProvider = {
      name: 'portable-provider',
      stream() {
        throw new ModelProviderError({
          kind: 'rate_limit',
          stage: 'stream_establishment',
          upstreamStatus: 429,
          upstreamRequestId: 'req_safe_123',
          retryAfterMs: 4_000,
          cause: new Error('secret upstream message'),
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, { retry: { maxRetries: 0 } }),
    );
    const error = events.find((event) => event.type === 'error');

    expect(error).toMatchObject({
      code: 'PROVIDER_FAILED',
      modelCall: {
        modelCallId: expect.any(String),
        runId: events[0].runId,
        turn: 1,
        callSequence: 1,
        trigger: 'initial',
        provider: 'portable-provider',
      },
      providerFailure: {
        kind: 'rate_limit',
        stage: 'stream_establishment',
        upstreamStatus: 429,
        upstreamRequestId: 'req_safe_123',
        retryAfterMs: 4_000,
      },
    });
    expect(JSON.stringify(error)).not.toContain('secret upstream message');
    expect(
      events
        .filter((event) => event.type !== 'error')
        .every((event) => {
          return !('modelCall' in event) && !('providerFailure' in event);
        }),
    ).toBe(true);
  });
});

describe('terminal hooks and abandonment', () => {
  it('runs all terminal call hooks and stops retries on a critical failure', async () => {
    const order: string[] = [];
    let providerCalls = 0;
    const model: ModelProvider = {
      name: 'failing',
      stream() {
        providerCalls += 1;
        throw new ModelProviderError({
          kind: 'connection',
          stage: 'stream_establishment',
          cause: new Error('offline'),
        });
      },
    };
    const hooks: Hook[] = [
      {
        name: 'critical-usage',
        afterModelCall: () => {
          order.push('critical');
          throw new Error('usage persistence failed');
        },
      },
      {
        name: 'telemetry',
        afterModelCallFailureMode: 'best_effort',
        afterModelCall: () => {
          order.push('best-effort');
          throw new Error('telemetry failed');
        },
      },
      {
        name: 'cleanup',
        afterModelCall: () => {
          order.push('cleanup');
        },
      },
    ];

    const events = await collectEvents(
      baseInput(model, {
        hooks,
        retry: {
          maxRetries: 3,
          backoff: { initialDelayMs: 0, jitterRatio: 0 },
        },
      }),
    );

    expect(order).toEqual(['critical', 'best-effort', 'cleanup']);
    expect(providerCalls).toBe(1);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'HOOK_FAILED',
      modelCall: {
        modelCallId: expect.any(String),
        provider: 'failing',
      },
      providerFailure: { kind: 'connection' },
      details: {
        hookName: 'critical-usage',
        phase: 'afterModelCall',
        underlyingError: { code: 'PROVIDER_FAILED' },
      },
    });
  });

  it('finalizes call, turn, and run once when the consumer abandons the stream', async () => {
    const phases: string[] = [];
    const model: ModelProvider = {
      name: 'streaming',
      async *stream() {
        yield { textDelta: 'first' };
        await new Promise(() => undefined);
      },
    };
    const hook: Hook = {
      name: 'observer',
      afterModelCall: (ctx) => {
        phases.push(`call:${ctx.outcome.type}`);
      },
      afterModelTurn: (ctx) => {
        phases.push(`turn:${ctx.outcome.type}`);
      },
      runEnd: (ctx) => {
        phases.push(`run:${ctx.status}`);
      },
    };
    const events: RunEvent[] = [];
    const { run } = await import('./run');

    for await (const event of run(baseInput(model, { hooks: [hook] }))) {
      events.push(event);
      if (event.type === 'text_delta') break;
    }

    expect(events.at(-1)).toMatchObject({ type: 'text_delta' });
    expect(phases).toEqual([
      'call:consumer_abandoned',
      'turn:consumer_abandoned',
      'run:aborted',
    ]);
  });

  it('continues after best-effort call hook failures', async () => {
    let providerCalls = 0;
    const model: ModelProvider = {
      name: 'recovers',
      stream() {
        providerCalls += 1;
        if (providerCalls === 1) {
          throw new ModelProviderError({
            kind: 'connection',
            stage: 'stream_establishment',
            cause: new Error('offline'),
          });
        }
        return streamChunks(textTurn('Recovered'));
      },
    };
    const hook: Hook = {
      name: 'telemetry',
      afterModelCallFailureMode: 'best_effort',
      afterModelCall: () => {
        throw new Error('collector unavailable');
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
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });
});

describe('retry input', () => {
  it('rejects invalid retry configuration synchronously', async () => {
    const { run } = await import('./run');

    expect(() =>
      run(
        baseInput(new MockProvider([]), {
          retry: { maxRetries: -1 },
        }),
      ),
    ).toThrow(/maxRetries/);
    expect(() =>
      run(
        baseInput(new MockProvider([]), {
          retry: { backoff: { jitterRatio: 2 } },
        }),
      ),
    ).toThrow(/jitterRatio/);
  });
});

const streamChunks = (
  chunks: readonly ProviderChunk[],
): AsyncIterable<ProviderChunk> => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) yield chunk;
  },
});
