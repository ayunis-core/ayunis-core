import type * as GoogleGenAiModule from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';
import { ModelProviderError } from '@ayunis/inference';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gemini } from './gemini-provider';

const google = vi.hoisted(() => ({
  constructor: vi.fn(),
  generateContentStream: vi.fn(),
}));

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof GoogleGenAiModule>();
  return { ...actual, GoogleGenAI: google.constructor };
});

const request = {
  instructions: '',
  messages: [],
  tools: [],
};

const textResponse = {
  candidates: [{ content: { role: 'model', parts: [{ text: 'hello' }] } }],
} as GenerateContentResponse;

beforeEach(() => {
  google.constructor.mockReset();
  google.generateContentStream.mockReset();
  google.constructor.mockImplementation(function () {
    return { models: { generateContentStream: google.generateContentStream } };
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('gemini', () => {
  it('names the provider gemini:<model> and exposes a stream function', () => {
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });
    expect(provider.name).toBe('gemini:gemini-2.5-pro');
    expect(typeof provider.stream).toBe('function');
  });

  it('normalizes stream establishment failures with portable facts', async () => {
    const cause = {
      statusCode: 429,
      request_id: 'gemini-request-1',
      headers: { 'retry-after': '2' },
    };
    google.generateContentStream.mockRejectedValue(cause);
    const provider = gemini({
      apiKey: 'sk-test',
      model: 'gemini-2.5-flash',
      maxRetries: 0,
    });

    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await expect(result).rejects.toMatchObject({
      name: 'ModelProviderError',
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'gemini-request-1',
      retryAfterMs: 2_000,
      cause,
    });
    await expect(result).rejects.toBeInstanceOf(ModelProviderError);
  });

  it('preserves a normalized next failure when iterator cleanup rejects', async () => {
    const cause = { status: 503 };
    const cleanup = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const iterator = {
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: textResponse })
        .mockRejectedValueOnce(cause),
      return: cleanup,
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    google.generateContentStream.mockResolvedValue(iterator);
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });
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
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });

    const result = provider
      .stream(malformedRequest)
      [Symbol.asyncIterator]()
      .next();

    await expect(result).rejects.toBe(localError);
    expect(google.generateContentStream).not.toHaveBeenCalled();
  });

  it('leaves local schema conversion errors raw', async () => {
    const localError = new Error('local schema conversion failed');
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });
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
    expect(google.generateContentStream).not.toHaveBeenCalled();
  });

  it('preserves a local chunk conversion error when cleanup rejects', async () => {
    const conversionError = new Error('local chunk conversion failed');
    const malformedResponse = {
      get candidates(): never {
        throw conversionError;
      },
    };
    const cleanup = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const iterator = {
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: malformedResponse }),
      return: cleanup,
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    google.generateContentStream.mockResolvedValue(iterator);
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });

    const result = provider.stream(request)[Symbol.asyncIterator]().next();

    await expect(result).rejects.toBe(conversionError);
    await expect(result).rejects.not.toBeInstanceOf(ModelProviderError);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('forwards cancellation and classifies an active-stream abort', async () => {
    const controller = new AbortController();
    let markIterationStarted: () => void = () => undefined;
    const iterationStarted = new Promise<void>((resolve) => {
      markIterationStarted = resolve;
    });
    google.generateContentStream.mockImplementation(
      ({ config }: { config: { abortSignal?: AbortSignal } }) => {
        const signal = config.abortSignal;
        return Promise.resolve({
          next: () => {
            markIterationStarted();
            return new Promise((_, reject) => {
              signal?.addEventListener(
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
        });
      },
    );
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });
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
    expect(google.generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ abortSignal: controller.signal }),
      }),
    );
  });

  it('keeps setup retries configurable for direct non-streaming adapters', async () => {
    vi.useFakeTimers();
    const emptyStream = {
      next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    google.generateContentStream
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(emptyStream);
    const provider = gemini({
      apiKey: 'sk-test',
      model: 'gemini-2.5-pro',
      maxRetries: 1,
    });

    const result = provider.stream(request)[Symbol.asyncIterator]().next();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toEqual({ done: true, value: undefined });
    expect(google.generateContentStream).toHaveBeenCalledTimes(2);
  });

  it('does not start another stream attempt when aborted during retry backoff', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const emptyStream = {
      next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    google.generateContentStream
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(emptyStream);
    const provider = gemini({
      apiKey: 'sk-test',
      model: 'gemini-2.5-pro',
      maxRetries: 1,
    });

    const pending = provider
      .stream({ ...request, signal: controller.signal })
      [Symbol.asyncIterator]()
      .next();
    expect(google.generateContentStream).toHaveBeenCalledOnce();
    const rejected = expect(pending).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_establishment',
    });
    controller.abort();
    await vi.runAllTimersAsync();

    await rejected;
    expect(google.generateContentStream).toHaveBeenCalledOnce();
  });

  it('opens exactly one SDK stream when maxRetries is zero', async () => {
    google.generateContentStream.mockRejectedValue(new Error('unavailable'));
    const provider = gemini({
      apiKey: 'sk-test',
      model: 'gemini-2.5-pro',
      maxRetries: 0,
    });

    await expect(
      provider.stream(request)[Symbol.asyncIterator]().next(),
    ).rejects.toBeInstanceOf(ModelProviderError);
    expect(google.generateContentStream).toHaveBeenCalledOnce();
  });
});
