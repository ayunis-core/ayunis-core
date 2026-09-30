import { ModelProviderError } from '@ayunis/inference';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Hook, ModelCallOutcomeSnapshot } from '../contracts/hook';
import type { ModelProvider, ProviderChunk } from '../contracts/provider';
import { DEFAULT_RETRY_CONFIG } from '../contracts/run-input';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { run } from './run';
import {
  baseInput,
  collectEvents,
  echoTool,
  userMessage,
} from './test-helpers';

afterEach(() => {
  vi.useRealTimers();
});

describe('consumer-close driver', () => {
  it('interrupts a pending provider next and awaits terminal hooks', async () => {
    const cleanupController = new AbortController();
    const providerStarted = deferred<void>();
    const phases: string[] = [];
    let providerReturns = 0;
    const model = pendingProvider('pending', providerStarted, () => {
      providerReturns += 1;
    });
    const hook: Hook = {
      name: 'terminal-observer',
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
    const iterator = run(
      baseInput(model, {
        hooks: [hook],
        signal: cleanupController.signal,
      }),
    )[Symbol.asyncIterator]();
    await iterator.next();
    const pending = iterator.next();
    await providerStarted.promise;

    const close = iterator.return?.();
    const closeResult = close ? await settlesWithin(close, 25) : 'unsupported';
    if (closeResult !== 'settled') cleanupController.abort();
    await Promise.allSettled([pending, close]);

    expect(closeResult).toBe('settled');
    expect(providerReturns).toBe(1);
    expect(phases).toEqual([
      'call:consumer_abandoned',
      'turn:consumer_abandoned',
      'run:aborted',
    ]);
  });

  it('interrupts retry backoff without opening another call', async () => {
    const cleanupController = new AbortController();
    const enteredBackoff = deferred<void>();
    const phases: string[] = [];
    let calls = 0;
    const model: ModelProvider = {
      name: 'backoff',
      stream() {
        calls += 1;
        throw new ModelProviderError({
          kind: 'connection',
          stage: 'stream_establishment',
          cause: new Error('offline'),
        });
      },
    };
    const iterator = run(
      baseInput(model, {
        signal: cleanupController.signal,
        hooks: [
          {
            name: 'call-observer',
            afterModelCall: (ctx) => {
              phases.push(`call:${ctx.outcome.type}`);
              enteredBackoff.resolve();
            },
            afterModelTurn: (ctx) => {
              phases.push(`turn:${ctx.outcome.type}`);
            },
            runEnd: (ctx) => {
              phases.push(`run:${ctx.status}`);
            },
          },
        ],
        retry: {
          maxRetries: 2,
          backoff: { initialDelayMs: 60_000, jitterRatio: 0 },
        },
      }),
    )[Symbol.asyncIterator]();
    await iterator.next();
    const pending = iterator.next();
    await enteredBackoff.promise;

    const close = iterator.return?.();
    const closeResult = close ? await settlesWithin(close, 25) : 'unsupported';
    if (closeResult !== 'settled') cleanupController.abort();
    await Promise.allSettled([pending, close]);

    expect(closeResult).toBe('settled');
    expect(calls).toBe(1);
    expect(phases).toEqual([
      'call:provider_failure',
      'turn:consumer_abandoned',
      'run:aborted',
    ]);
  });

  it('propagates consumer close into an active child call', async () => {
    const cleanupController = new AbortController();
    const childStarted = deferred<void>();
    let childReturns = 0;
    const child = pendingProvider('child', childStarted, () => {
      childReturns += 1;
    });
    const spawn = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: 'Child',
          model: child,
          messages: [userMessage('Go')],
        })) {
          expect(event.runId).toBeTypeOf('string');
        }
        return 'child done';
      },
    });
    const parent = new MockProvider([
      toolCallTurn({ id: 'spawn-1', name: 'spawn', input: {} }),
    ]);
    const iterator = run(
      baseInput(parent, {
        signal: cleanupController.signal,
        tools: [spawn],
      }),
    )[Symbol.asyncIterator]();

    let event = await iterator.next();
    while (!event.done && event.value.type !== 'assistant_message') {
      event = await iterator.next();
    }
    const pending = iterator.next();
    await childStarted.promise;

    const close = iterator.return?.();
    const closeResult = close ? await settlesWithin(close, 25) : 'unsupported';
    if (closeResult !== 'settled') cleanupController.abort();
    await Promise.allSettled([pending, close]);

    expect(closeResult).toBe('settled');
    expect(childReturns).toBe(1);
  });
});

describe('terminal call integrity', () => {
  it('isolates the run-end error from hooks and the terminal event', async () => {
    const mutationErrors: string[] = [];
    const observed: Array<{ message: string; kind?: string }> = [];
    const model: ModelProvider = {
      name: 'run-end-error',
      stream() {
        throw new ModelProviderError({
          kind: 'server',
          stage: 'stream_establishment',
          upstreamStatus: 503,
          cause: new Error('unavailable'),
        });
      },
    };
    const mutator: Hook = {
      name: 'error-mutator',
      runEnd: (ctx) => {
        if (!ctx.error) return;
        const details = ctx.error.details as {
          providerFailure: { kind: string };
        };
        for (const mutate of [
          () => {
            (ctx.error as { message: string }).message = 'tampered';
          },
          () => {
            details.providerFailure.kind = 'rejection';
          },
        ]) {
          try {
            mutate();
          } catch (error) {
            mutationErrors.push(error instanceof Error ? error.name : 'error');
          }
        }
      },
    };
    const observer: Hook = {
      name: 'error-observer',
      runEnd: (ctx) => {
        if (!ctx.error) return;
        const details = ctx.error.details as {
          providerFailure?: { kind?: string };
        };
        observed.push({
          message: ctx.error.message,
          kind: details.providerFailure?.kind,
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [mutator, observer],
        retry: { maxRetries: 0 },
      }),
    );

    expect(mutationErrors).toHaveLength(2);
    expect(observed).toEqual([
      { message: 'Model provider request failed', kind: 'server' },
    ]);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      message: 'Model provider request failed',
      providerFailure: { kind: 'server' },
    });
  });

  it('finalizes a turn as consumer-abandoned when close arrives during afterModelCall', async () => {
    const hookStarted = deferred<void>();
    const releaseHook = deferred<void>();
    const turnOutcomes: Array<{
      type: string;
      callType?: string;
      assistantMessages: number;
    }> = [];
    const runStatuses: string[] = [];
    const model = new MockProvider([textTurn('Answer')]);
    const hook: Hook = {
      name: 'delayed-call-finalizer',
      afterModelCall: async () => {
        hookStarted.resolve();
        await releaseHook.promise;
      },
      afterModelTurn: (ctx) => {
        turnOutcomes.push({
          type: ctx.outcome.type,
          callType: 'call' in ctx.outcome ? ctx.outcome.call?.type : undefined,
          assistantMessages: ctx.messages.filter(
            (message) => message.role === 'assistant',
          ).length,
        });
      },
      runEnd: (ctx) => {
        runStatuses.push(ctx.status);
      },
    };
    const iterator = run(baseInput(model, { hooks: [hook] }))[
      Symbol.asyncIterator
    ]();
    await iterator.next();
    await iterator.next();
    await iterator.next();
    const pending = iterator.next();
    await hookStarted.promise;

    const close = iterator.return?.();
    releaseHook.resolve();
    await Promise.allSettled([pending, close]);

    expect(turnOutcomes).toEqual([
      {
        type: 'consumer_abandoned',
        callType: 'accepted',
        assistantMessages: 0,
      },
    ]);
    expect(runStatuses).toEqual(['aborted']);
  });

  it('gives all terminal hooks an immutable isolated outcome', async () => {
    const mutationErrors: string[] = [];
    const observed: Array<{
      text: string;
      inputTokens: number | undefined;
      kind: string | undefined;
    }> = [];
    const model = failingAfterChunk({
      textDelta: 'Original',
      usage: { inputTokens: 7, outputTokens: 3 },
    });
    const mutator: Hook = {
      name: 'mutator',
      afterModelCall: (ctx) => {
        const mutations = [
          ...outcomeMutations(ctx.outcome),
          () => Object.defineProperty(ctx, 'outcome', { value: undefined }),
        ];
        for (const mutate of mutations) {
          try {
            mutate();
          } catch (error) {
            mutationErrors.push(error instanceof Error ? error.name : 'error');
          }
        }
      },
    };
    const observer: Hook = {
      name: 'observer',
      afterModelCall: (ctx) => {
        observed.push({
          text: textOf(ctx.outcome),
          inputTokens: ctx.outcome.usage.inputTokens,
          kind:
            ctx.outcome.type === 'provider_failure'
              ? ctx.outcome.providerFailure.kind
              : undefined,
        });
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [mutator, observer],
        retry: { maxRetries: 0 },
      }),
    );

    expect(mutationErrors).toHaveLength(4);
    expect(observed).toEqual([
      { text: 'Original', inputTokens: 7, kind: 'server' },
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      usage: { inputTokens: 7, outputTokens: 3 },
    });
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      providerFailure: { kind: 'server' },
    });
  });

  it.each(['sync_throw', 'async_rejection'] as const)(
    'awaits and suppresses iterator cleanup %s without replacing the provider failure',
    async (cleanupMode) => {
      const order: string[] = [];
      const model = cleanupFailingProvider(cleanupMode, order);
      const afterModelCall = vi.fn(() => {
        order.push('afterModelCall');
      });

      const events = await collectEvents(
        baseInput(model, {
          hooks: [{ name: 'observer', afterModelCall }],
          retry: { maxRetries: 0 },
        }),
      );

      expect(order).toEqual(
        cleanupMode === 'async_rejection'
          ? ['return', 'cleanup rejected', 'afterModelCall']
          : ['return', 'afterModelCall'],
      );
      expect(afterModelCall).toHaveBeenCalledOnce();
      expect(events.find((event) => event.type === 'error')).toMatchObject({
        code: 'PROVIDER_FAILED',
        providerFailure: { kind: 'server', upstreamStatus: 503 },
      });
    },
  );

  it('retains terminal status and error when the consumer stops on error', async () => {
    const runEnds: Array<{ status: string; code?: string }> = [];
    const model: ModelProvider = {
      name: 'terminal-error',
      stream() {
        throw new ModelProviderError({
          kind: 'rejection',
          stage: 'stream_establishment',
          upstreamStatus: 400,
          cause: new Error('rejected'),
        });
      },
    };

    for await (const event of run(
      baseInput(model, {
        hooks: [
          {
            name: 'run-end-observer',
            runEnd: (ctx) => {
              runEnds.push({ status: ctx.status, code: ctx.error?.code });
            },
          },
        ],
        retry: { maxRetries: 0 },
      }),
    )) {
      if (event.type === 'error') break;
    }

    expect(runEnds).toEqual([{ status: 'error', code: 'PROVIDER_FAILED' }]);
  });

  it('marks a buffered tool snapshot visible before abandonment finalizes the call', async () => {
    const outcomes: ModelCallOutcomeSnapshot[] = [];
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: 'x' } }),
    ]);

    for await (const event of run(
      baseInput(model, {
        hooks: [
          {
            name: 'observer',
            afterModelCall: (ctx) => {
              outcomes.push(ctx.outcome);
            },
          },
        ],
        tools: [echoTool()],
      }),
    )) {
      if (event.type === 'tool_call_snapshot') break;
    }

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      type: 'consumer_abandoned',
      visibleOutput: true,
    });
  });

  it('classifies runtime idle after metadata as stream consumption', async () => {
    vi.useFakeTimers();
    const outcomes: ModelCallOutcomeSnapshot[] = [];
    const model: ModelProvider = {
      name: 'metadata-then-idle',
      async *stream(request) {
        yield { usage: { inputTokens: 4 } };
        await rejectOnAbort(request.signal);
      },
    };
    const pending = collectEvents(
      baseInput(model, {
        hooks: [
          {
            name: 'observer',
            afterModelCall: (ctx) => {
              outcomes.push(ctx.outcome);
            },
          },
        ],
        modelCallIdleTimeoutMs: 1_000,
        retry: { maxRetries: 0 },
      }),
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await pending;

    expect(outcomes[0]).toMatchObject({
      type: 'provider_failure',
      providerFailure: {
        kind: 'timeout',
        stage: 'stream_consumption',
      },
    });
  });

  it('uses deterministic retry timing by default', () => {
    expect(DEFAULT_RETRY_CONFIG.backoff).toMatchObject({
      initialDelayMs: 500,
      multiplier: 2,
      maxDelayMs: 8_000,
      jitterRatio: 0,
    });
  });
});

const pendingProvider = (
  name: string,
  started: ReturnType<typeof deferred<void>>,
  onReturn: () => void,
): ModelProvider => ({
  name,
  stream: () => new PendingStream(started, onReturn),
});

class PendingStream implements AsyncIterable<ProviderChunk> {
  constructor(
    private readonly started: ReturnType<typeof deferred<void>>,
    private readonly onReturn: () => void,
  ) {}

  [Symbol.asyncIterator](): AsyncIterator<ProviderChunk> {
    return {
      next: () => {
        this.started.resolve();
        return new Promise<IteratorResult<ProviderChunk>>(() => undefined);
      },
      return: async () => {
        this.onReturn();
        return { done: true, value: undefined };
      },
    };
  }
}

const failingAfterChunk = (chunk: ProviderChunk): ModelProvider => ({
  name: 'failing-after-chunk',
  stream: () => failingChunkStream(chunk),
});

async function* failingChunkStream(
  chunk: ProviderChunk,
): AsyncGenerator<ProviderChunk> {
  yield chunk;
  throw new ModelProviderError({
    kind: 'server',
    stage: 'stream_consumption',
    upstreamStatus: 503,
    cause: new Error('unavailable'),
  });
}

const cleanupFailingProvider = (
  mode: 'sync_throw' | 'async_rejection',
  order: string[],
): ModelProvider => ({
  name: `cleanup-${mode}`,
  stream: () => new CleanupFailingStream(mode, order),
});

class CleanupFailingStream implements AsyncIterable<ProviderChunk> {
  constructor(
    private readonly mode: 'sync_throw' | 'async_rejection',
    private readonly order: string[],
  ) {}

  [Symbol.asyncIterator](): AsyncIterator<ProviderChunk> {
    return {
      next: () => this.failProvider(),
      return: () => this.failCleanup(),
    };
  }

  private failProvider(): Promise<IteratorResult<ProviderChunk>> {
    return Promise.reject(
      new ModelProviderError({
        kind: 'server',
        stage: 'stream_establishment',
        upstreamStatus: 503,
        cause: new Error('original provider failure'),
      }),
    );
  }

  private failCleanup(): Promise<IteratorResult<ProviderChunk>> {
    this.order.push('return');
    if (this.mode === 'sync_throw') throw new Error('cleanup failed');
    return Promise.resolve().then(() => {
      this.order.push('cleanup rejected');
      throw new Error('cleanup failed');
    });
  }
}

const outcomeMutations = (
  outcome: ModelCallOutcomeSnapshot,
): Array<() => void> => [
  () => {
    const text = outcome.message.content.find(
      (content) => content.type === 'text',
    );
    if (text?.type === 'text') {
      (text as { text: string }).text = 'Mutated';
    }
  },
  () => {
    (outcome.usage as { inputTokens?: number }).inputTokens = 999;
  },
  () => {
    if (outcome.type === 'provider_failure') {
      const facts = outcome.providerFailure as { kind: string };
      facts.kind = 'rejection';
    }
  },
];

const textOf = (outcome: ModelCallOutcomeSnapshot): string =>
  outcome.message.content
    .filter((content) => content.type === 'text')
    .map((content) => content.text)
    .join('');

const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} => {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const settlesWithin = async (
  promise: PromiseLike<unknown>,
  timeoutMs: number,
): Promise<'settled' | 'timed_out'> =>
  Promise.race([
    Promise.resolve(promise).then(
      () => 'settled' as const,
      () => 'settled' as const,
    ),
    new Promise<'timed_out'>((resolve) => {
      setTimeout(() => resolve('timed_out'), timeoutMs);
    }),
  ]);

const rejectOnAbort = (signal: AbortSignal | undefined): Promise<never> =>
  new Promise((_, reject) => {
    const abort = (): void =>
      reject(new DOMException('The operation was aborted', 'AbortError'));
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
