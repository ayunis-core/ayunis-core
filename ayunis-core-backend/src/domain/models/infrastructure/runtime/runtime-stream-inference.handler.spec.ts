import { ModelProviderError, type ModelProvider } from '@ayunis/inference';
import { Logger } from '@nestjs/common';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type {
  StreamInferenceAttemptLifecycle,
  StreamInferenceInput,
} from 'src/domain/models/application/ports/stream-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';
import { RuntimeStreamInferenceHandler } from './runtime-stream-inference.handler';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import {
  RATE_LIMIT_MAX_WAIT_MS,
  SETUP_RETRY_BACKOFF_MS,
} from 'src/common/errors/provider-transport-error.classifier';

/** Rejects the way a provider SDK does when its request signal aborts. */
function whenAborted(signal: AbortSignal | undefined): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    const fail = () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      reject(abortError);
    };
    if (!signal) return;
    // An SDK checks the signal before waiting on it, so an abort that lands
    // between the request and the wait is not lost.
    if (signal.aborted) return fail();
    signal.addEventListener('abort', fail);
  });
}

/**
 * A provider that yields one chunk and then hangs until aborted — the shape
 * of a socket that dies mid-response.
 */
function stallingProvider(): {
  provider: ModelProvider;
  signal: () => AbortSignal | undefined;
} {
  let captured: AbortSignal | undefined;
  const provider: ModelProvider = {
    name: 'test:stalling',
    async *stream(request) {
      captured = request.signal;
      yield { textDelta: 'first' };
      await whenAborted(request.signal);
    },
  };
  return { provider, signal: () => captured };
}

class CacheTestHandler extends RuntimeStreamInferenceHandler {
  readonly createProvider = jest.fn((): ModelProvider => ({
    name: 'test:cached',
    stream: jest.fn(),
  }));

  constructor() {
    super({} as ImageContentService);
  }
}

class TestHandler extends RuntimeStreamInferenceHandler {
  constructor(private readonly provider: ModelProvider) {
    super({} as ImageContentService);
  }
  protected createProvider(): ModelProvider {
    return this.provider;
  }
}

function makeInput(
  attemptLifecycle?: StreamInferenceAttemptLifecycle,
): StreamInferenceInput {
  return {
    model: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'test-model',
      provider: 'test',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    messages: [],
    systemPrompt: '',
    tools: [],
    orgId: 'org-1',
    attemptLifecycle,
  } as unknown as StreamInferenceInput;
}

/** Resolves once the handler has emitted its first chunk. */
function firstChunkOf(handler: TestHandler): {
  arrived: Promise<void>;
  failure: Promise<unknown>;
  unsubscribe: () => void;
} {
  let onArrival!: () => void;
  const arrived = new Promise<void>((resolve) => (onArrival = resolve));
  let onFailure!: (error: unknown) => void;
  const failure = new Promise<unknown>((resolve) => (onFailure = resolve));

  const subscription = handler.answer(makeInput()).subscribe({
    next: () => onArrival(),
    error: onFailure,
  });

  return { arrived, failure, unsubscribe: () => subscription.unsubscribe() };
}

describe('RuntimeStreamInferenceHandler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rebuilds a cached provider when the model configuration changes', () => {
    const handler = new CacheTestHandler();
    const model = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'test-model',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as unknown as Model;

    handler.resolveProvider(model);
    handler.resolveProvider(model);
    handler.resolveProvider({
      ...model,
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    expect(handler.createProvider).toHaveBeenCalledTimes(2);
    expect(
      (
        handler as unknown as {
          providerCache: Map<string, ModelProvider>;
        }
      ).providerCache,
    ).toHaveProperty('size', 1);
  });

  it('fails a stalled stream with InferenceStreamStalledError rather than a generic abort', async () => {
    const { provider } = stallingProvider();
    const { arrived, failure } = firstChunkOf(new TestHandler(provider));

    await arrived;
    jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS);

    await expect(failure).resolves.toBeInstanceOf(InferenceStreamStalledError);
  });

  it('does not replace a terminal accounting failure with the stall reason', async () => {
    const accountingError = new Error('usage persistence failed');
    let terminalCalls = 0;
    const provider: ModelProvider = {
      name: 'test:stalled-accounting',
      async *stream(request) {
        yield { usage: { inputTokens: 7, outputTokens: 3 } };
        await whenAborted(request.signal);
      },
    };
    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: () => {
              terminalCalls += 1;
              return Promise.reject(accountingError);
            },
          }),
        )
        .subscribe({ error: resolve });
    });

    await jest.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS);

    await expect(failed).resolves.toBe(accountingError);
    expect(terminalCalls).toBe(1);
  });

  it('leaves a stream alone while it keeps producing just inside the budget', async () => {
    const { provider } = stallingProvider();
    const { arrived, failure } = firstChunkOf(new TestHandler(provider));

    await arrived;
    jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS - 1);

    const settled = await Promise.race([
      failure,
      Promise.resolve('still streaming'),
    ]);
    expect(settled).toBe('still streaming');
  });

  it('aborts the provider call when the subscriber unsubscribes', async () => {
    const { provider, signal } = stallingProvider();
    const { arrived, unsubscribe } = firstChunkOf(new TestHandler(provider));

    await arrived;
    expect(signal()?.aborted).toBe(false);

    unsubscribe();

    expect(signal()?.aborted).toBe(true);
  });

  it('does not retry a stall that happens after chunks were already emitted', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:mid-stream-stall',
      async *stream(request) {
        calls += 1;
        yield { textDelta: 'first' };
        await whenAborted(request.signal);
      },
    };
    const { arrived, failure } = firstChunkOf(new TestHandler(provider));

    await arrived;
    await jest.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS);

    await expect(failure).resolves.toBeInstanceOf(InferenceStreamStalledError);
    expect(calls).toBe(1);
  });

  it('retries once when a transient connection failure happens before the first chunk', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:flaky-dns',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          yield await Promise.reject(
            Object.assign(new Error('getaddrinfo EAI_AGAIN'), {
              code: 'EAI_AGAIN',
            }),
          );
        }
        yield { textDelta: 'recovered' };
      },
    };

    const deltas: (string | null)[] = [];
    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => deltas.push(chunk.textContentDelta),
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);

    await completed;
    expect(deltas).toEqual(['recovered']);
    expect(calls).toBe(2);
  });

  it('retries once when a provider timeout happens before the first chunk', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:timeout-recovery',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          yield await Promise.reject(
            Object.assign(new Error('request timed out'), {
              code: 'ETIMEDOUT',
            }),
          );
        }
        yield { textDelta: 'recovered' };
      },
    };

    const deltas: (string | null)[] = [];
    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => deltas.push(chunk.textContentDelta),
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);

    await completed;
    expect(deltas).toEqual(['recovered']);
    expect(calls).toBe(2);
  });

  it('retries portable provider failures without logging their raw causes', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    let calls = 0;
    const provider: ModelProvider = {
      name: 'openai:compatible-model',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          yield await Promise.reject(
            new ModelProviderError({
              kind: 'server',
              stage: 'stream_establishment',
              upstreamStatus: 503,
              cause: new Error('provider echoed classified resident data'),
            }),
          );
        }
        yield { textDelta: 'recovered' };
      },
    };

    const deltas: (string | null)[] = [];
    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => deltas.push(chunk.textContentDelta),
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);

    await completed;
    expect(deltas).toEqual(['recovered']);
    expect(calls).toBe(2);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: 'test',
        reason: 'server',
      }),
      'Provider stream failed before the first chunk',
    );
    expect(warn.mock.calls[0]?.[0]).not.toHaveProperty('err');
  });

  it('recovers on the third attempt after repeated provider server failures', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:server-recovery',
      async *stream() {
        calls += 1;
        if (calls < 3) {
          yield await Promise.reject(
            Object.assign(new Error('service unavailable'), { status: 503 }),
          );
        }
        yield { textDelta: 'recovered' };
      },
    };

    const deltas: (string | null)[] = [];
    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => deltas.push(chunk.textContentDelta),
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS * 3);

    await completed;
    expect(deltas).toEqual(['recovered']);
    expect(calls).toBe(3);
  });

  it('does not retry a transient failure when the subscriber unsubscribes during the backoff', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:flaky-then-cancel',
      async *stream() {
        calls += 1;
        yield await Promise.reject(
          Object.assign(new Error('getaddrinfo EAI_AGAIN'), {
            code: 'EAI_AGAIN',
          }),
        );
      },
    };

    const subscription = new TestHandler(provider)
      .answer(makeInput())
      .subscribe({ next: () => undefined, error: () => undefined });
    // Let the first attempt fail and the backoff start...
    await jest.advanceTimersByTimeAsync(0);
    // ...then disconnect while it is waiting.
    subscription.unsubscribe();
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);

    expect(calls).toBe(1);
  });

  it('does not retry a connection failure after chunks were already emitted', async () => {
    let calls = 0;
    const reset = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });
    const provider: ModelProvider = {
      name: 'test:mid-stream-reset',
      async *stream() {
        calls += 1;
        yield { textDelta: 'first' };
        throw reset;
      },
    };
    const { arrived, failure } = firstChunkOf(new TestHandler(provider));

    await arrived;
    await expect(failure).resolves.toBe(reset);
    expect(calls).toBe(1);
  });

  it('waits out a short retry-after before retrying a rate limit', async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:rate-limit-recovery',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          yield await Promise.reject(
            Object.assign(new Error('rate limit exceeded'), {
              status: 429,
              headers: { 'retry-after': '2' },
            }),
          );
        }
        yield { textDelta: 'recovered' };
      },
    };

    const deltas: (string | null)[] = [];
    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => deltas.push(chunk.textContentDelta),
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(1_999);
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1);

    await completed;
    expect(deltas).toEqual(['recovered']);
    expect(calls).toBe(2);
  });

  it('does not retry a rate limit whose retry-after exceeds the wait budget', async () => {
    let calls = 0;
    const rejection = Object.assign(new Error('rate limit exceeded'), {
      status: 429,
      headers: { 'retry-after': String(RATE_LIMIT_MAX_WAIT_MS / 1000 + 1) },
    });
    const provider: ModelProvider = {
      name: 'test:rate-limit-too-long',
      async *stream() {
        calls += 1;
        yield await Promise.reject(rejection);
      },
    };

    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: () => undefined,
        error: resolve,
      });
    });

    await expect(failed).resolves.toBe(rejection);
    expect(calls).toBe(1);
  });

  it('does not retry non-transport provider failures', async () => {
    let calls = 0;
    const rejection = Object.assign(new Error('bad request'), {
      status: 400,
    });
    const provider: ModelProvider = {
      name: 'test:rejected',
      async *stream() {
        calls += 1;
        yield await Promise.reject(rejection);
      },
    };

    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: () => undefined,
        error: resolve,
      });
    });

    await expect(failed).resolves.toBe(rejection);
    expect(calls).toBe(1);
  });

  it('passes chunks through and completes when the provider streams normally', async () => {
    const provider: ModelProvider = {
      name: 'test:healthy',
      async *stream() {
        yield { textDelta: 'hello' };
        yield { textDelta: ' world' };
      },
    };
    const handler = new TestHandler(provider);

    const deltas = await new Promise<(string | null)[]>((resolve, reject) => {
      const seen: (string | null)[] = [];
      handler.answer(makeInput()).subscribe({
        next: (chunk) => seen.push(chunk.textContentDelta),
        complete: () => resolve(seen),
        error: reject,
      });
    });

    expect(deltas).toEqual(['hello', ' world']);
  });

  it('gates each provider attempt after the prior attempt usage is persisted', async () => {
    const order: string[] = [];
    let calls = 0;
    let releasePersistence!: () => void;
    const persistence = new Promise<void>((resolve) => {
      releasePersistence = resolve;
    });
    const provider: ModelProvider = {
      name: 'test:accounted-retry',
      async *stream() {
        calls += 1;
        order.push(`provider:${calls}`);
        if (calls === 1) {
          yield { usage: { inputTokens: 4, outputTokens: 1 } };
          throw Object.assign(new Error('service unavailable'), {
            status: 503,
          });
        }
        yield { textDelta: 'recovered' };
      },
    };
    const lifecycle: StreamInferenceAttemptLifecycle = {
      onAttemptStart: async () => {
        order.push(`gate:${calls + 1}`);
      },
      onAttemptTerminal: async ({ usage }) => {
        order.push(`account:${calls}:${usage?.inputTokens}`);
        if (calls === 1) await persistence;
      },
    };

    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput(lifecycle)).subscribe({
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);
    expect(calls).toBe(1);

    releasePersistence();
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);
    await completed;

    expect(order).toEqual([
      'gate:1',
      'provider:1',
      'account:1:4',
      'gate:2',
      'provider:2',
      'account:2:undefined',
    ]);
  });

  it('assigns a distinct correlation ID to every direct stream attempt', async () => {
    const requestIds: string[] = [];
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:distinct-attempt-ids',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          throw Object.assign(new Error('service unavailable'), {
            status: 503,
          });
        }
        yield { textDelta: 'recovered' };
      },
    };
    const lifecycle: StreamInferenceAttemptLifecycle = {
      onAttemptStart: ({ requestId }) => {
        requestIds.push(requestId);
      },
      onAttemptTerminal: () => undefined,
    };

    const completed = new Promise<void>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput(lifecycle)).subscribe({
        complete: resolve,
        error: reject,
      });
    });
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);
    await completed;

    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).not.toBe(requestIds[1]);
    expect(requestIds).toEqual([
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    ]);
  });

  it('folds cache usage into input tokens exactly once at attempt termination', async () => {
    const terminal = jest.fn();
    const provider: ModelProvider = {
      name: 'test:cached-usage',
      async *stream() {
        yield {
          usage: {
            inputTokens: 3,
            outputTokens: 2,
            cacheReadInputTokens: 11,
            cacheWriteInputTokens: 5,
          },
        };
      },
    };

    await new Promise<void>((resolve, reject) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: terminal,
          }),
        )
        .subscribe({ complete: resolve, error: reject });
    });

    expect(terminal).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'completed',
        usage: { inputTokens: 19, outputTokens: 2 },
      }),
    );
  });

  it('uses the latest value of each cumulative usage dimension across frames', async () => {
    const terminal = jest.fn();
    const provider: ModelProvider = {
      name: 'test:cumulative-usage',
      async *stream() {
        yield {
          usage: {
            inputTokens: 3,
            outputTokens: 1,
            cacheReadInputTokens: 10,
            cacheWriteInputTokens: 2,
          },
        };
        yield {
          usage: {
            inputTokens: 5,
            outputTokens: 4,
            cacheReadInputTokens: 12,
            cacheWriteInputTokens: 3,
          },
        };
      },
    };

    await new Promise<void>((resolve, reject) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: terminal,
          }),
        )
        .subscribe({ complete: resolve, error: reject });
    });

    expect(terminal).toHaveBeenCalledTimes(1);
    expect(terminal).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: { inputTokens: 20, outputTokens: 4 },
      }),
    );
  });

  it.each([
    ['failed', new Error('invalid request')],
    ['aborted', Object.assign(new Error('aborted'), { name: 'AbortError' })],
  ] as const)('accounts usage for a %s attempt', async (outcome, error) => {
    const terminal = jest.fn();
    const provider: ModelProvider = {
      name: `test:${outcome}-usage`,
      async *stream() {
        yield { usage: { inputTokens: 7, outputTokens: 3 } };
        throw error;
      },
    };

    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: terminal,
          }),
        )
        .subscribe({ error: resolve });
    });

    await expect(failed).resolves.toBe(error);
    expect(terminal).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome,
        usage: { inputTokens: 7, outputTokens: 3 },
      }),
    );
  });

  it('does not classify finish-only metadata as emitted output', async () => {
    const terminal = jest.fn();
    const provider: ModelProvider = {
      name: 'test:finish-only',
      async *stream() {
        yield { finishReason: 'stop' };
      },
    };

    await new Promise<void>((resolve, reject) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: terminal,
          }),
        )
        .subscribe({ complete: resolve, error: reject });
    });

    expect(terminal).toHaveBeenCalledWith({
      requestId: expect.any(String),
      outcome: 'completed',
      usage: undefined,
      outputEmitted: false,
    });
  });

  it('preserves emitted output but fails before completion when terminal accounting rejects', async () => {
    const accountingError = new Error('provider usage missing');
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:missing-usage',
      async *stream() {
        calls += 1;
        yield { textDelta: 'visible answer' };
      },
    };
    const events: string[] = [];
    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: () => Promise.reject(accountingError),
          }),
        )
        .subscribe({
          next: () => events.push('output'),
          complete: () => events.push('complete'),
          error: (error) => {
            events.push('error');
            resolve(error);
          },
        });
    });

    await expect(failed).resolves.toBe(accountingError);
    expect(events).toEqual(['output', 'error']);
    expect(calls).toBe(1);
  });

  it('surfaces critical persistence failure without retrying the provider', async () => {
    const persistenceError = new Error('usage persistence failed');
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:persistence-failure',
      async *stream() {
        calls += 1;
        yield { usage: { inputTokens: 6, outputTokens: 0 } };
        throw Object.assign(new Error('service unavailable'), { status: 503 });
      },
    };
    const failed = new Promise<unknown>((resolve) => {
      new TestHandler(provider)
        .answer(
          makeInput({
            onAttemptStart: () => undefined,
            onAttemptTerminal: () => Promise.reject(persistenceError),
          }),
        )
        .subscribe({ error: resolve });
    });

    await expect(failed).resolves.toBe(persistenceError);
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);
    expect(calls).toBe(1);
  });

  it('awaits terminal accounting internally after the subscriber cancels', async () => {
    let accountingFinished = false;
    let releaseAccounting!: () => void;
    const accounting = new Promise<void>((resolve) => {
      releaseAccounting = () => {
        accountingFinished = true;
        resolve();
      };
    });
    let terminalStarted!: () => void;
    const started = new Promise<void>((resolve) => (terminalStarted = resolve));
    const provider: ModelProvider = {
      name: 'test:cancelled-accounting',
      async *stream(request) {
        yield { usage: { inputTokens: 8, outputTokens: 2 } };
        await whenAborted(request.signal);
      },
    };
    const subscription = new TestHandler(provider)
      .answer(
        makeInput({
          onAttemptStart: () => undefined,
          onAttemptTerminal: async ({ outcome }) => {
            expect(outcome).toBe('aborted');
            terminalStarted();
            await accounting;
          },
        }),
      )
      .subscribe();
    await jest.advanceTimersByTimeAsync(0);

    subscription.unsubscribe();
    await started;
    expect(accountingFinished).toBe(false);

    releaseAccounting();
    await accounting;
    expect(accountingFinished).toBe(true);
  });

  it('keeps the legacy no-callback stream behavior', async () => {
    const provider: ModelProvider = {
      name: 'test:legacy-no-callback',
      async *stream() {
        yield { textDelta: 'legacy answer' };
      },
    };

    const result = await new Promise<string | null>((resolve, reject) => {
      new TestHandler(provider).answer(makeInput()).subscribe({
        next: (chunk) => resolve(chunk.textContentDelta),
        error: reject,
      });
    });

    expect(result).toBe('legacy answer');
  });
});
