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

beforeEach(() => {
  mistralSdk.constructor.mockReset();
  mistralSdk.stream.mockReset();
  mistralSdk.constructor.mockImplementation(function () {
    return { chat: { stream: mistralSdk.stream } };
  });
});

afterEach(() => {
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

  it('preserves a normalized next failure when iterator cleanup rejects', async () => {
    const cause = { statusCode: 503 };
    const cleanup = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const iterator = {
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: textEvent })
        .mockRejectedValueOnce(cause),
      return: cleanup,
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    mistralSdk.stream.mockResolvedValue(iterator);
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
    expect(cleanup).toHaveBeenCalledOnce();
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
    const iterator = {
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: malformedEvent }),
      return: cleanup,
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    mistralSdk.stream.mockResolvedValue(iterator);
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
    let markIterationStarted: () => void = () => undefined;
    const iterationStarted = new Promise<void>((resolve) => {
      markIterationStarted = resolve;
    });
    mistralSdk.stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) =>
        Promise.resolve({
          next: () => {
            markIterationStarted();
            return new Promise((_, reject) => {
              options.signal.addEventListener(
                'abort',
                () => reject(new DOMException('Aborted', 'AbortError')),
                { once: true },
              );
            });
          },
          return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          [Symbol.asyncIterator]() {
            return this;
          },
        }),
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
  });

  it('classifies a deadline during stream establishment', async () => {
    const deadlineController = new AbortController();
    let markSetupStarted: () => void = () => undefined;
    const setupStarted = new Promise<void>((resolve) => {
      markSetupStarted = resolve;
    });
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadlineController.signal);
    mistralSdk.stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) => {
        markSetupStarted();
        return new Promise((_, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      },
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await setupStarted;
    deadlineController.abort();

    await expect(result).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_establishment',
      timeoutSource: 'whole_stream',
    });
  });

  it('classifies the whole-stream deadline separately from host cancellation', async () => {
    const deadlineController = new AbortController();
    let markIterationStarted: () => void = () => undefined;
    const iterationStarted = new Promise<void>((resolve) => {
      markIterationStarted = resolve;
    });
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadlineController.signal);
    mistralSdk.stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) =>
        Promise.resolve({
          next: () => {
            markIterationStarted();
            return new Promise((_, reject) => {
              options.signal.addEventListener(
                'abort',
                () => reject(new DOMException('Aborted', 'AbortError')),
                { once: true },
              );
            });
          },
          return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          [Symbol.asyncIterator]() {
            return this;
          },
        }),
    );
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await iterationStarted;
    deadlineController.abort();

    await expect(result).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_consumption',
      timeoutSource: 'whole_stream',
    });
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
