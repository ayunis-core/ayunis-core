import { ModelProviderError } from '@ayunis/inference';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Hook } from '../contracts/hook';
import type { ModelProvider, ProviderChunk } from '../contracts/provider';
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
});

describe('provider retry policy', () => {
  it('honors Retry-After ahead of backoff when it is within the wait cap', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const model: ModelProvider = {
      name: 'rate-limited',
      stream() {
        calls += 1;
        if (calls === 1) {
          throw new ModelProviderError({
            kind: 'rate_limit',
            stage: 'stream_establishment',
            retryAfterMs: 2_000,
            cause: new Error('limited'),
          });
        }
        return chunks(textTurn('Recovered'));
      },
    };

    const pending = collectEvents(
      baseInput(model, {
        retry: {
          maxRetries: 1,
          backoff: { initialDelayMs: 50, jitterRatio: 0 },
          retryAfter: { precedence: 'retry_after', maxWaitMs: 3_000 },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(1_999);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'run_end', status: 'completed' }),
      ]),
    );
    expect(calls).toBe(2);
  });

  it('does not retry a Retry-After above the accepted wait cap', async () => {
    let calls = 0;
    const model: ModelProvider = {
      name: 'long-rate-limit',
      stream() {
        calls += 1;
        throw new ModelProviderError({
          kind: 'rate_limit',
          stage: 'stream_establishment',
          retryAfterMs: 10_001,
          cause: new Error('limited'),
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        retry: {
          maxRetries: 3,
          retryAfter: { maxWaitMs: 10_000 },
        },
      }),
    );

    expect(calls).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('does not retry provider failure categories disabled by the host', async () => {
    let calls = 0;
    const model: ModelProvider = {
      name: 'disabled-category',
      stream() {
        calls += 1;
        throw new ModelProviderError({
          kind: 'server',
          stage: 'stream_establishment',
          upstreamStatus: 503,
          cause: new Error('unavailable'),
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        retry: {
          maxRetries: 3,
          retryableProviderFailureKinds: ['connection'],
        },
      }),
    );

    expect(calls).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('keeps unsolicited provider abort errors as terminal provider failures', async () => {
    const outcomes: string[] = [];
    const model: ModelProvider = {
      name: 'unsolicited-provider-abort',
      stream() {
        throw new ModelProviderError({
          kind: 'abort',
          stage: 'stream_establishment',
          cause: new Error('provider cancelled its own request'),
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [
          {
            name: 'outcome-observer',
            afterModelCall: (ctx) => {
              outcomes.push(ctx.outcome.type);
            },
          },
        ],
      }),
    );

    expect(outcomes).toEqual(['provider_failure']);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
      providerFailure: { kind: 'abort' },
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
    });
  });

  it('interrupts provider backoff on host cancellation', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let calls = 0;
    const model: ModelProvider = {
      name: 'offline',
      stream() {
        calls += 1;
        throw new ModelProviderError({
          kind: 'connection',
          stage: 'stream_establishment',
          cause: new Error('offline'),
        });
      },
    };
    const pending = collectEvents(
      baseInput(model, {
        signal: controller.signal,
        retry: {
          maxRetries: 3,
          backoff: { initialDelayMs: 60_000, jitterRatio: 0 },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    const events = await pending;

    expect(calls).toBe(1);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });

  it('uses the exported default of three retries as the full turn budget', async () => {
    const model = new MockProvider([[], [], [], [], textTurn('too late')]);

    const events = await collectEvents(baseInput(model));

    expect(model.requests).toHaveLength(4);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
    });
  });
});

describe('per-call cancellation and idle timeout', () => {
  it('retries an idle call before output and closes its iterator', async () => {
    vi.useFakeTimers();
    let calls = 0;
    let closed = 0;
    const model: ModelProvider = {
      name: 'idle-once',
      async *stream(request) {
        calls += 1;
        if (calls === 1) {
          try {
            await rejectOnAbort(request.signal);
          } finally {
            closed += 1;
          }
          return;
        }
        yield* chunks(textTurn('Recovered'));
      },
    };
    const pending = collectEvents(
      baseInput(model, {
        modelCallIdleTimeoutMs: 1_000,
        retry: {
          maxRetries: 1,
          backoff: { initialDelayMs: 0, jitterRatio: 0 },
        },
      }),
    );

    await vi.advanceTimersByTimeAsync(1_000);
    const events = await pending;

    expect(calls).toBe(2);
    expect(closed).toBe(1);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('does not block terminal lifecycle on hostile iterator cleanup', async () => {
    vi.useFakeTimers();
    let nextCalls = 0;
    let rejectCleanup!: (reason: unknown) => void;
    const cleanup = new Promise<IteratorResult<ProviderChunk>>((_, reject) => {
      rejectCleanup = reject;
    });
    const phases: string[] = [];
    const model: ModelProvider = {
      name: 'hostile-cleanup',
      stream() {
        return {
          [Symbol.asyncIterator]: () => ({
            next: () => {
              nextCalls += 1;
              if (nextCalls === 1) {
                return Promise.resolve({
                  done: false as const,
                  value: { usage: { inputTokens: 7, outputTokens: 3 } },
                });
              }
              return new Promise<IteratorResult<ProviderChunk>>(
                () => undefined,
              );
            },
            return: () => cleanup,
          }),
        };
      },
    };
    const hook: Hook = {
      name: 'terminal-observer',
      afterModelCall: (ctx) => {
        phases.push(
          `call:${ctx.outcome.type}:${ctx.outcome.usage.inputTokens}`,
        );
      },
      afterModelTurn: (ctx) => {
        phases.push(`turn:${ctx.outcome.type}`);
      },
      runEnd: (ctx) => {
        phases.push(`run:${ctx.status}`);
      },
    };
    const pending = collectEvents(
      baseInput(model, {
        hooks: [hook],
        modelCallIdleTimeoutMs: 1_000,
        retry: { maxRetries: 0 },
      }),
    );

    await vi.advanceTimersByTimeAsync(1_000);
    const terminalRace = Promise.race([
      pending.then(() => 'completed' as const),
      new Promise<'blocked'>((resolve) => {
        setTimeout(() => resolve('blocked'), 1);
      }),
    ]);
    await vi.advanceTimersByTimeAsync(1);
    const result = await terminalRace;
    rejectCleanup(new Error('cleanup rejected late'));
    const events = await pending;
    await Promise.resolve();

    expect(result).toBe('completed');
    expect(phases).toEqual([
      'call:provider_failure:7',
      'turn:error',
      'run:error',
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
      usage: { inputTokens: 7, outputTokens: 3 },
    });
  });

  it('does not retry an idle call after visible output', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const model: ModelProvider = {
      name: 'visible-idle',
      async *stream(request) {
        calls += 1;
        yield { textDelta: 'Partial' };
        await rejectOnAbort(request.signal);
      },
    };
    const pending = collectEvents(
      baseInput(model, {
        modelCallIdleTimeoutMs: 1_000,
        retry: {
          maxRetries: 3,
          backoff: { initialDelayMs: 0, jitterRatio: 0 },
        },
      }),
    );

    await vi.advanceTimersByTimeAsync(1_000);
    const events = await pending;

    expect(calls).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'text_delta', delta: 'Partial' }),
    );
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('closes the provider and awaits terminal hooks after host cancellation', async () => {
    const controller = new AbortController();
    const phases: string[] = [];
    let closed = 0;
    const model: ModelProvider = {
      name: 'cancelled',
      async *stream(request) {
        try {
          yield { textDelta: 'Partial' };
          controller.abort();
          await rejectOnAbort(request.signal);
        } finally {
          closed += 1;
        }
      },
    };
    const hook: Hook = {
      name: 'terminal',
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

    const events = await collectEvents(
      baseInput(model, { hooks: [hook], signal: controller.signal }),
    );

    expect(closed).toBe(1);
    expect(phases).toEqual(['call:aborted', 'turn:aborted', 'run:aborted']);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });
});

describe('turn finalization and child runs', () => {
  it('invokes every afterModelTurn hook and surfaces the critical failure', async () => {
    const order: string[] = [];
    const hooks: Hook[] = [
      {
        name: 'persistence',
        afterModelTurn: () => {
          order.push('persistence');
          throw new Error('message persistence failed');
        },
      },
      {
        name: 'telemetry',
        afterModelTurnFailureMode: 'best_effort',
        afterModelTurn: () => {
          order.push('telemetry');
          throw new Error('telemetry failed');
        },
      },
      {
        name: 'cleanup',
        afterModelTurn: () => {
          order.push('cleanup');
        },
      },
    ];

    const events = await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), { hooks }),
    );

    expect(order).toEqual(['persistence', 'telemetry', 'cleanup']);
    expect(
      events.find((event) => event.type === 'assistant_message'),
    ).toBeUndefined();
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'HOOK_FAILED',
      details: { hookName: 'persistence', phase: 'afterModelTurn' },
    });
  });

  it('exposes only the accepted response to turn persistence', async () => {
    const persisted: string[] = [];
    const hook: Hook = {
      name: 'persistence',
      afterModelTurn: (ctx) => {
        persisted.push(
          ctx.messages
            .flatMap((message) => message.content)
            .filter((content) => content.type === 'text')
            .map((content) => content.text)
            .join('|'),
        );
      },
    };
    const model = new MockProvider([[], textTurn('Accepted')]);

    await collectEvents(baseInput(model, { hooks: [hook] }));

    expect(persisted).toEqual(['Hi|Accepted']);
  });

  it('propagates parent cancellation into an active child call', async () => {
    const controller = new AbortController();
    const childStatuses: string[] = [];
    const child: ModelProvider = {
      name: 'waiting-child',
      stream(request) {
        controller.abort();
        return {
          [Symbol.asyncIterator]: () => ({
            next: () => rejectOnAbort(request.signal),
          }),
        };
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
          if (event.type === 'run_end') childStatuses.push(event.status);
        }
        return 'child stopped';
      },
    });
    const parent = new MockProvider([
      toolCallTurn({ id: 'spawn-1', name: 'spawn', input: {} }),
    ]);

    const events = await collectEvents(
      baseInput(parent, {
        signal: controller.signal,
        tools: [spawn],
      }),
    );

    expect(childStatuses).toEqual(['aborted']);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });

  it('inherits retry policy in children, allows override, and reports the actual model', async () => {
    const seenProviders: string[] = [];
    const observer: Hook = {
      name: 'model-observer',
      beforeModelCall: (ctx) => {
        seenProviders.push(ctx.model.name);
      },
    };
    const inheritedChild = new MockProvider([[], textTurn('too late')]);
    const overriddenChild = new MockProvider([[], textTurn('child recovered')]);
    const childStatuses: string[] = [];
    const spawn = echoTool({
      name: 'spawn',
      execute: async (input, ctx) => {
        const childModel = input.override ? overriddenChild : inheritedChild;
        for await (const event of ctx.runChild({
          instructions: 'Child',
          model: childModel,
          messages: [userMessage('Go')],
          ...(input.override ? { retry: { maxRetries: 1 } } : {}),
        })) {
          if (event.type === 'run_end') childStatuses.push(event.status);
        }
        return 'child done';
      },
    });
    const parent = new MockProvider([
      toolCallTurn({ id: 'one', name: 'spawn', input: { override: false } }),
      toolCallTurn({ id: 'two', name: 'spawn', input: { override: true } }),
      textTurn('parent done'),
    ]);

    const events = await collectEvents(
      baseInput(parent, {
        hooks: [observer],
        tools: [spawn],
        retry: { maxRetries: 0 },
      }),
    );

    expect(childStatuses).toEqual(['error', 'completed']);
    expect(inheritedChild.requests).toHaveLength(1);
    expect(overriddenChild.requests).toHaveLength(2);
    expect(seenProviders).toContain(parent.name);
    expect(seenProviders).toContain(inheritedChild.name);
    expect(seenProviders).toContain(overriddenChild.name);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });
});

const chunks = (
  values: readonly ProviderChunk[],
): AsyncIterable<ProviderChunk> => ({
  async *[Symbol.asyncIterator]() {
    for (const value of values) yield value;
  },
});

const rejectOnAbort = (signal: AbortSignal | undefined): Promise<never> =>
  new Promise((_, reject) => {
    const abort = (): void =>
      reject(new DOMException('The operation was aborted', 'AbortError'));
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
