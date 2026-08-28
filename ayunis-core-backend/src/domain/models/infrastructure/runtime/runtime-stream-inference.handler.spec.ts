import type { ModelProvider } from '@ayunis/inference';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { StreamInferenceInput } from 'src/domain/models/application/ports/stream-inference.handler';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';
import { RuntimeStreamInferenceHandler } from './runtime-stream-inference.handler';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import { SETUP_RETRY_BACKOFF_MS } from 'src/common/errors/provider-transport-error.classifier';

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

class TestHandler extends RuntimeStreamInferenceHandler {
  constructor(private readonly provider: ModelProvider) {
    super(createPinoLoggerMock(), {} as ImageContentService);
  }
  protected createProvider(): ModelProvider {
    return this.provider;
  }
}

function makeInput(): StreamInferenceInput {
  return {
    model: { name: 'test-model', provider: 'test' },
    messages: [],
    systemPrompt: '',
    tools: [],
    orgId: 'org-1',
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
  afterEach(() => jest.useRealTimers());

  it('fails a stalled stream with InferenceStreamStalledError rather than a generic abort', async () => {
    const { provider } = stallingProvider();
    const { arrived, failure } = firstChunkOf(new TestHandler(provider));

    await arrived;
    jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS);

    await expect(failure).resolves.toBeInstanceOf(InferenceStreamStalledError);
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

  it('does not retry non-transport provider failures', async () => {
    let calls = 0;
    const rejection = Object.assign(new Error('rate limited'), {
      status: 429,
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
});
