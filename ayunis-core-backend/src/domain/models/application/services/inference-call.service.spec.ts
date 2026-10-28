import { ModelProviderError, type ModelProvider } from '@ayunis/inference';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import {
  InferenceStreamStalledError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import type { InferenceCallTerminalHandler } from 'src/domain/models/application/models/inference-call-terminal';
import type { InferenceProviderRegistry } from 'src/domain/models/application/registry/inference-provider.registry';
import {
  InferenceCallService,
  type InferenceCall,
} from './inference-call.service';

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

function serviceFor(provider: ModelProvider): InferenceCallService {
  const registry = {
    resolve: () => provider,
  } as unknown as InferenceProviderRegistry;
  return new InferenceCallService(registry, {} as ImageContentService);
}

function makeCall(
  onCallTerminal?: InferenceCallTerminalHandler,
): InferenceCall {
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
    onCallTerminal,
  } as unknown as InferenceCall;
}

function countingProvider(stream: ModelProvider['stream']): {
  provider: ModelProvider;
  calls: () => number;
} {
  let calls = 0;
  return {
    provider: {
      name: 'test:counting',
      stream: (request) => {
        calls += 1;
        return stream(request);
      },
    },
    calls: () => calls,
  };
}

/** Resolves once the service has emitted its first chunk. */
function firstChunkOf(service: InferenceCallService): {
  arrived: Promise<void>;
  failure: Promise<unknown>;
  unsubscribe: () => void;
} {
  let onArrival!: () => void;
  const arrived = new Promise<void>((resolve) => (onArrival = resolve));
  let onFailure!: (error: unknown) => void;
  const failure = new Promise<unknown>((resolve) => (onFailure = resolve));

  const subscription = service.stream(makeCall()).subscribe({
    next: () => onArrival(),
    error: onFailure,
  });

  return { arrived, failure, unsubscribe: () => subscription.unsubscribe() };
}

describe('InferenceCallService.stream', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fails a stalled stream with InferenceStreamStalledError rather than a generic abort', async () => {
    const { provider } = stallingProvider();
    const { arrived, failure } = firstChunkOf(serviceFor(provider));

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
      serviceFor(provider)
        .stream(
          makeCall(() => {
            terminalCalls += 1;
            return Promise.reject(accountingError);
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
    const { arrived, failure } = firstChunkOf(serviceFor(provider));

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
    const { arrived, unsubscribe } = firstChunkOf(serviceFor(provider));

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
    const { arrived, failure } = firstChunkOf(serviceFor(provider));

    await arrived;
    await jest.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS);

    await expect(failure).resolves.toBeInstanceOf(InferenceStreamStalledError);
    expect(calls).toBe(1);
  });

  it.each([
    [
      'connection setup',
      Object.assign(new Error('getaddrinfo EAI_AGAIN'), { code: 'EAI_AGAIN' }),
    ],
    [
      'timeout',
      Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }),
    ],
    [
      'server',
      new ModelProviderError({
        kind: 'server',
        stage: 'stream_establishment',
        upstreamStatus: 503,
        cause: new Error('service unavailable'),
      }),
    ],
    [
      'rate-limit',
      Object.assign(new Error('rate limit exceeded'), {
        status: 429,
        headers: { 'retry-after': '1' },
      }),
    ],
    [
      'request rejection',
      Object.assign(new Error('bad request'), { status: 400 }),
    ],
  ])(
    'makes exactly one provider call for a %s failure before output',
    async (_failure, rejection) => {
      let calls = 0;
      const provider: ModelProvider = {
        name: 'test:single-call',
        async *stream() {
          calls += 1;
          yield await Promise.reject(rejection);
        },
      };
      const terminal = jest.fn<Promise<void>, []>();

      const failed = new Promise<unknown>((resolve) => {
        serviceFor(provider)
          .stream(makeCall(terminal))
          .subscribe({
            next: () => undefined,
            error: resolve,
          });
      });
      await jest.advanceTimersByTimeAsync(60_000);

      await expect(failed).resolves.toBe(rejection);
      expect(calls).toBe(1);
      expect(terminal).not.toHaveBeenCalled();
    },
  );

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
    const { arrived, failure } = firstChunkOf(serviceFor(provider));

    await arrived;
    await expect(failure).resolves.toBe(reset);
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
    const service = serviceFor(provider);

    const deltas = await new Promise<(string | null)[]>((resolve, reject) => {
      const seen: (string | null)[] = [];
      service.stream(makeCall()).subscribe({
        next: (chunk) => seen.push(chunk.textContentDelta),
        complete: () => resolve(seen),
        error: reject,
      });
    });

    expect(deltas).toEqual(['hello', ' world']);
  });
  it('folds cache usage into input tokens exactly once at call termination', async () => {
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
      serviceFor(provider)
        .stream(makeCall(terminal))
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
      serviceFor(provider)
        .stream(makeCall(terminal))
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
      serviceFor(provider)
        .stream(makeCall(terminal))
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

  it('reports a completed call that returned no usage', async () => {
    const terminal = jest.fn();
    const provider: ModelProvider = {
      name: 'test:finish-only',
      async *stream() {
        yield { finishReason: 'stop' };
      },
    };

    await new Promise<void>((resolve, reject) => {
      serviceFor(provider)
        .stream(makeCall(terminal))
        .subscribe({ complete: resolve, error: reject });
    });

    expect(terminal).toHaveBeenCalledWith({
      outcome: 'completed',
      usage: undefined,
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
      serviceFor(provider)
        .stream(makeCall(() => Promise.reject(accountingError)))
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
      serviceFor(provider)
        .stream(makeCall(() => Promise.reject(persistenceError)))
        .subscribe({ error: resolve });
    });

    await expect(failed).resolves.toBe(persistenceError);
    await jest.advanceTimersByTimeAsync(60_000);
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
    const subscription = serviceFor(provider)
      .stream(
        makeCall(async ({ outcome }) => {
          expect(outcome).toBe('aborted');
          terminalStarted();
          await accounting;
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

  it('streams without terminal accounting when no handler is supplied', async () => {
    const provider: ModelProvider = {
      name: 'test:no-terminal-handler',
      async *stream() {
        yield { textDelta: 'plain answer' };
      },
    };

    const result = await new Promise<string | null>((resolve, reject) => {
      serviceFor(provider)
        .stream(makeCall())
        .subscribe({
          next: (chunk) => resolve(chunk.textContentDelta),
          error: reject,
        });
    });

    expect(result).toBe('plain answer');
  });
});

describe('InferenceCallService.complete', () => {
  it('reports folded usage once after a completed call', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const { provider } = countingProvider(async function* () {
      yield { textDelta: 'answer' };
      yield {
        finishReason: 'stop',
        usage: {
          inputTokens: 3,
          outputTokens: 2,
          cacheReadInputTokens: 11,
          cacheWriteInputTokens: 5,
        },
      };
    });

    const response = await serviceFor(provider).complete(makeCall(terminal));

    expect(response.meta).toEqual({
      inputTokens: 19,
      outputTokens: 2,
      totalTokens: 21,
    });
    expect(terminal).toHaveBeenCalledTimes(1);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'completed',
      usage: { inputTokens: 19, outputTokens: 2 },
    });
  });

  it('makes exactly one provider call and reports nothing for a failure before output', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const failure = new ModelProviderError({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      retryAfterMs: 1_000,
      cause: new Error('rate limited'),
    });
    const { provider, calls } = countingProvider(async function* () {
      yield await Promise.reject(failure);
    });

    await expect(
      serviceFor(provider).complete(makeCall(terminal)),
    ).rejects.toBe(failure);
    expect(calls()).toBe(1);
    expect(terminal).not.toHaveBeenCalled();
  });

  it('reports usage of a consumed call that failed and keeps the provider failure', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const failure = Object.assign(new Error('service unavailable'), {
      status: 503,
    });
    const { provider, calls } = countingProvider(async function* () {
      yield {
        textDelta: 'partial',
        usage: { inputTokens: 7, outputTokens: 3 },
      };
      throw failure;
    });

    await expect(
      serviceFor(provider).complete(makeCall(terminal)),
    ).rejects.toBe(failure);
    expect(calls()).toBe(1);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'failed',
      usage: { inputTokens: 7, outputTokens: 3 },
    });
  });

  it('reports usage of a completed call rejected as a truncated tool call', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const { provider } = countingProvider(async function* () {
      yield {
        toolCallDeltas: [{ index: 0, id: 'call-1', name: 'create_document' }],
      };
      yield {
        finishReason: 'length',
        usage: { inputTokens: 4, outputTokens: 9 },
      };
    });

    await expect(
      serviceFor(provider).complete(makeCall(terminal)),
    ).rejects.toBeInstanceOf(InferenceTokenLimitError);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'failed',
      usage: { inputTokens: 4, outputTokens: 9 },
    });
  });

  it('fails the call when terminal accounting rejects', async () => {
    const accountingError = new Error('provider usage missing');
    const { provider } = countingProvider(async function* () {
      yield { textDelta: 'answer', finishReason: 'stop' };
    });

    await expect(
      serviceFor(provider).complete(
        makeCall(() => Promise.reject(accountingError)),
      ),
    ).rejects.toBe(accountingError);
  });
});
