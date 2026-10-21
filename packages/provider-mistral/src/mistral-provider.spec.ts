import type { CompletionEvent } from '@mistralai/mistralai/models/components';
import { ModelProviderError } from '@ayunis/inference';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mistral } from './mistral-provider';

const mistralSdk = vi.hoisted(() => ({
  constructor: vi.fn(),
  stream: vi.fn(),
}));

vi.mock('@mistralai/mistralai', () => ({ Mistral: mistralSdk.constructor }));

const request = {
  instructions: '',
  messages: [],
  tools: [],
};

const textEvent = {
  data: {
    choices: [
      {
        index: 0,
        delta: { content: 'hello', toolCalls: null },
        finishReason: null,
      },
    ],
  },
} as CompletionEvent;

// The SDK returns an EventStream: a ReadableStream of parsed events.
const sdkStream = (
  read: () => Promise<IteratorResult<unknown>>,
  cancel: (reason: unknown) => Promise<void> = () => Promise.resolve(),
) =>
  new ReadableStream(
    {
      async pull(controller) {
        const result = await read();
        if (result.done) controller.close();
        else controller.enqueue(result.value);
      },
      cancel,
    },
    { highWaterMark: 0 },
  );

// A read that only an explicit cancel can end, like a socket whose abort
// signal was lost.
const pendingForever = () => new Promise<never>(() => undefined);

beforeEach(() => {
  mistralSdk.constructor.mockReset();
  mistralSdk.stream.mockReset();
  mistralSdk.constructor.mockImplementation(function () {
    return { chat: { stream: mistralSdk.stream } };
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('mistral', () => {
  it('names the provider mistral:<model> and exposes a stream function', () => {
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    expect(provider.name).toBe('mistral:mistral-large-latest');
    expect(typeof provider.stream).toBe('function');
  });

  it('normalizes stream establishment failures with portable facts', async () => {
    const cause = {
      statusCode: 429,
      requestId: 'mistral-request-1',
      headers: { 'retry-after-ms': '750' },
    };
    mistralSdk.stream.mockRejectedValue(cause);
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-small-latest',
      maxRetries: 0,
    });

    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await expect(result).rejects.toMatchObject({
      name: 'ModelProviderError',
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'mistral-request-1',
      retryAfterMs: 750,
      cause,
    });
    await expect(result).rejects.toBeInstanceOf(ModelProviderError);
  });

  it('normalizes a failure while consuming the stream', async () => {
    const cause = { statusCode: 503 };
    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: textEvent })
      .mockRejectedValueOnce(cause);
    mistralSdk.stream.mockResolvedValue(sdkStream(read));
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    const output = provider.stream(request)[Symbol.asyncIterator]();

    await expect(output.next()).resolves.toMatchObject({
      done: false,
      value: { textDelta: 'hello' },
    });
    await expect(output.next()).rejects.toMatchObject({
      kind: 'server',
      stage: 'stream_consumption',
      upstreamStatus: 503,
      cause,
    });
  });

  it('leaves local request conversion errors raw', async () => {
    const localError = new Error('local request conversion failed');
    const malformedRequest = {
      ...request,
      get messages(): never {
        throw localError;
      },
    };
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });

    const result = provider
      .stream(malformedRequest)
      [Symbol.asyncIterator]()
      .next();

    await expect(result).rejects.toBe(localError);
    expect(mistralSdk.stream).not.toHaveBeenCalled();
  });

  it('leaves local schema conversion errors raw', async () => {
    const localError = new Error('local schema conversion failed');
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    const result = provider
      .stream({
        ...request,
        tools: [
          {
            name: 'test_tool',
            description: 'Test',
            parameters: {
              get type(): never {
                throw localError;
              },
            },
          },
        ],
      })
      [Symbol.asyncIterator]()
      .next();

    await expect(result).rejects.toBe(localError);
    expect(mistralSdk.stream).not.toHaveBeenCalled();
  });

  it('preserves a local chunk conversion error when cleanup rejects', async () => {
    const conversionError = new Error('local chunk conversion failed');
    const malformedEvent = {
      get data(): never {
        throw conversionError;
      },
    };
    const cleanup = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    mistralSdk.stream.mockResolvedValue(
      sdkStream(
        vi.fn().mockResolvedValueOnce({ done: false, value: malformedEvent }),
        cleanup,
      ),
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });

    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await expect(result).rejects.toBe(conversionError);
    await expect(result).rejects.not.toBeInstanceOf(ModelProviderError);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('classifies host cancellation as an active-stream abort', async () => {
    const controller = new AbortController();
    const cancel = vi.fn().mockResolvedValue(undefined);
    let markIterationStarted: () => void = () => undefined;
    const iterationStarted = new Promise<void>((resolve) => {
      markIterationStarted = resolve;
    });
    mistralSdk.stream.mockResolvedValue(
      sdkStream(() => {
        markIterationStarted();
        return pendingForever();
      }, cancel),
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    const result = provider
      .stream({ ...request, signal: controller.signal })
      [Symbol.asyncIterator]()
      .next();

    await iterationStarted;
    controller.abort();

    await expect(result).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_consumption',
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('times out a stream that does not start within the timeout', async () => {
    vi.useFakeTimers();
    mistralSdk.stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
      timeoutMs: 1_000,
    });
    const result = provider.stream(request)[Symbol.asyncIterator]().next();
    const assertion = expect(result).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_establishment',
      timeoutSource: 'response_start',
    });

    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
  });

  it('times out a stream that sends headers but no first chunk', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn().mockResolvedValue(undefined);
    mistralSdk.stream.mockResolvedValue(sdkStream(pendingForever, cancel));
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
      timeoutMs: 1_000,
    });
    const result = provider.stream(request)[Symbol.asyncIterator]().next();
    const assertion = expect(result).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_consumption',
      timeoutSource: 'response_start',
    });

    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('keeps the deadline armed past events that yield no chunk', async () => {
    vi.useFakeTimers();
    const roleOnlyEvent = {
      data: {
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: '', toolCalls: null },
            finishReason: null,
          },
        ],
      },
    } as CompletionEvent;
    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: roleOnlyEvent })
      .mockImplementation(pendingForever);
    mistralSdk.stream.mockResolvedValue(sdkStream(read));
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
      timeoutMs: 1_000,
    });
    const result = provider.stream(request)[Symbol.asyncIterator]().next();
    const assertion = expect(result).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_consumption',
      timeoutSource: 'response_start',
    });

    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('lets an established stream keep producing past the timeout', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    let remaining = 5;
    mistralSdk.stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return Promise.resolve(
          sdkStream(async () => {
            await new Promise((resolve) => setTimeout(resolve, 600));
            return remaining-- > 0
              ? { done: false, value: textEvent }
              : { done: true, value: undefined };
          }),
        );
      },
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
      timeoutMs: 1_000,
    });
    const chunks: unknown[] = [];
    const consumed = (async () => {
      for await (const chunk of provider.stream(request)) chunks.push(chunk);
    })();

    await vi.advanceTimersByTimeAsync(5_000);
    await consumed;

    expect(chunks).toHaveLength(5);
    expect(signal?.aborted).toBe(false);
  });

  it('opens exactly one SDK stream when maxRetries is zero', async () => {
    mistralSdk.stream.mockRejectedValue(new Error('unavailable'));
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
      maxRetries: 0,
    });

    await expect(
      provider.stream(request)[Symbol.asyncIterator]().next(),
    ).rejects.toBeInstanceOf(ModelProviderError);
    expect(mistralSdk.stream).toHaveBeenCalledOnce();
    expect(mistralSdk.constructor).toHaveBeenCalledWith(
      expect.objectContaining({ retryConfig: { strategy: 'none' } }),
    );
  });
});
