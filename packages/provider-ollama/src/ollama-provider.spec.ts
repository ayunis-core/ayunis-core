import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatResponse, Message } from 'ollama';

import type {
  ProviderChunk,
  ProviderRequest,
  ToolSchema,
} from '@ayunis/inference';
import { ModelProviderError } from '@ayunis/inference';

import { ollama } from './ollama-provider';

const ollamaClient = vi.hoisted(() => ({ chat: vi.fn() }));

vi.mock('ollama', () => ({
  Ollama: class {
    chat = ollamaClient.chat;
  },
}));

const request = (
  overrides: Partial<ProviderRequest> = {},
): ProviderRequest => ({
  instructions: '',
  messages: [],
  tools: [],
  ...overrides,
});

const response = (
  message: Partial<Message>,
  done: Partial<ChatResponse> = {},
): ChatResponse =>
  ({
    model: 'llama3.1',
    message: { role: 'assistant', content: '', ...message },
    done: false,
    ...done,
  }) as unknown as ChatResponse;

const sdkStream = (
  next: () => Promise<IteratorResult<ChatResponse>>,
  abort = vi.fn(),
  close = vi.fn().mockResolvedValue({ done: true, value: undefined }),
) => ({
  stream: {
    abort,
    [Symbol.asyncIterator]: () => ({ next, return: close }),
  },
  abort,
  close,
});

const collect = async (
  iterable: AsyncIterable<ProviderChunk>,
): Promise<ProviderChunk[]> => {
  const chunks: ProviderChunk[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
};

describe('ollama', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('names the provider ollama:<model> and exposes a stream function', () => {
    const provider = ollama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
    });
    expect(provider.name).toBe('ollama:llama3.1');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts auth headers and a retry budget', () => {
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
      headers: { Authorization: 'Bearer secret' },
      maxRetries: 3,
    });
    expect(provider.name).toBe('ollama:qwen3');
  });

  it('normalizes setup failures and preserves upstream facts and cause', async () => {
    const upstreamError = {
      status: 429,
      request_id: 'req_ollama_123',
      headers: { 'retry-after': '2' },
    };
    ollamaClient.chat.mockRejectedValue(upstreamError);
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
      maxRetries: 0,
    });

    const thrown = await collect(provider.stream(request())).catch(
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(ModelProviderError);
    expect(thrown).toMatchObject({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'req_ollama_123',
      retryAfterMs: 2_000,
      cause: upstreamError,
    });
  });

  it('makes exactly one chat call when maxRetries is zero', async () => {
    const upstreamError = Object.assign(new Error('connection failed'), {
      code: 'ECONNRESET',
    });
    ollamaClient.chat.mockImplementation(() => {
      throw upstreamError;
    });
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
      maxRetries: 0,
    });

    await expect(collect(provider.stream(request()))).rejects.toBeInstanceOf(
      ModelProviderError,
    );
    expect(ollamaClient.chat).toHaveBeenCalledTimes(1);
  });

  it('uses the configured retry budget for direct setup exceptions', async () => {
    vi.useFakeTimers();
    try {
      const upstreamError = Object.assign(new Error('connection failed'), {
        code: 'ECONNRESET',
      });
      const sdk = sdkStream(
        vi.fn().mockResolvedValue({ done: true, value: undefined }),
      );
      ollamaClient.chat
        .mockImplementationOnce(() => {
          throw upstreamError;
        })
        .mockResolvedValueOnce(sdk.stream);
      const provider = ollama({
        baseUrl: 'https://ollama.example.test',
        model: 'qwen3',
        maxRetries: 1,
      });

      const pending = collect(provider.stream(request()));
      await vi.advanceTimersByTimeAsync(1_000);

      await expect(pending).resolves.toEqual([]);
      expect(ollamaClient.chat).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start another chat attempt when aborted during retry backoff', async () => {
    vi.useFakeTimers();
    try {
      const upstreamError = Object.assign(new Error('connection failed'), {
        code: 'ECONNRESET',
      });
      const sdk = sdkStream(
        vi.fn().mockResolvedValue({ done: true, value: undefined }),
      );
      ollamaClient.chat
        .mockImplementationOnce(() => {
          throw upstreamError;
        })
        .mockResolvedValueOnce(sdk.stream);
      const controller = new AbortController();
      const provider = ollama({
        baseUrl: 'https://ollama.example.test',
        model: 'qwen3',
        maxRetries: 1,
      });

      const pending = collect(
        provider.stream(request({ signal: controller.signal })),
      );
      expect(ollamaClient.chat).toHaveBeenCalledOnce();
      const rejected = expect(pending).rejects.toMatchObject({
        kind: 'abort',
        stage: 'stream_establishment',
      });
      controller.abort();
      await vi.runAllTimersAsync();

      await rejected;
      expect(ollamaClient.chat).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves a normalized iteration failure when iterator cleanup rejects', async () => {
    const upstreamError = Object.assign(new Error('socket closed'), {
      code: 'UND_ERR_SOCKET',
    });
    const cleanupError = new Error('iterator cleanup failed');
    const next = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: response({ content: 'partial response' }),
      })
      .mockRejectedValueOnce(upstreamError);
    const close = vi.fn().mockRejectedValue(cleanupError);
    const sdk = sdkStream(next, vi.fn(), close);
    ollamaClient.chat.mockResolvedValue(sdk.stream);
    const controller = new AbortController();
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
      maxRetries: 3,
    });
    const iterator = provider
      .stream(request({ signal: controller.signal }))
      [Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: { textDelta: 'partial response' },
    });
    const thrown = await iterator.next().catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ModelProviderError);
    expect(thrown).toMatchObject({
      kind: 'connection',
      stage: 'stream_consumption',
      cause: upstreamError,
    });
    expect(ollamaClient.chat).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledOnce();
    controller.abort();
    expect(sdk.abort).not.toHaveBeenCalled();
  });

  it('leaves request conversion failures raw', async () => {
    const localError = new Error('tools getter failed');
    const malformedRequest = request();
    Object.defineProperty(malformedRequest, 'tools', {
      get: () => {
        throw localError;
      },
    });
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
    });

    await expect(collect(provider.stream(malformedRequest))).rejects.toBe(
      localError,
    );
    expect(ollamaClient.chat).not.toHaveBeenCalled();
  });

  it('leaves tool conversion failures raw', async () => {
    const localError = new Error('tool description getter failed');
    const malformedTool = {
      name: 'search_documents',
      get description(): string {
        throw localError;
      },
      parameters: {},
    } satisfies ToolSchema;
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
    });

    await expect(
      collect(provider.stream(request({ tools: [malformedTool] }))),
    ).rejects.toBe(localError);
    expect(ollamaClient.chat).not.toHaveBeenCalled();
  });

  it('preserves a raw chunk conversion failure when iterator cleanup rejects', async () => {
    const localError = new Error('chunk message getter failed');
    const cleanupError = new Error('iterator cleanup failed');
    const malformedChunk = {
      get message(): Message {
        throw localError;
      },
    } as ChatResponse;
    const next = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: malformedChunk });
    const close = vi.fn().mockRejectedValue(cleanupError);
    const sdk = sdkStream(next, vi.fn(), close);
    ollamaClient.chat.mockResolvedValue(sdk.stream);
    const controller = new AbortController();
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
    });

    await expect(
      collect(provider.stream(request({ signal: controller.signal }))),
    ).rejects.toBe(localError);
    expect(sdk.close).toHaveBeenCalledOnce();
    controller.abort();
    expect(sdk.abort).not.toHaveBeenCalled();
  });

  it('aborts an active stream and cleans up its iterator', async () => {
    let failNext: ((error: unknown) => void) | undefined;
    const next = vi.fn(
      () =>
        new Promise<IteratorResult<ChatResponse>>((_resolve, reject) => {
          failNext = reject;
        }),
    );
    const abort = vi.fn(() => {
      failNext?.(new DOMException('aborted', 'AbortError'));
    });
    const sdk = sdkStream(next, abort);
    ollamaClient.chat.mockResolvedValue(sdk.stream);
    const controller = new AbortController();
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
    });
    const iterator = provider
      .stream(request({ signal: controller.signal }))
      [Symbol.asyncIterator]();

    const pending = iterator.next();
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    const rejected = expect(pending).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_consumption',
    });
    controller.abort();

    expect(sdk.abort).toHaveBeenCalledOnce();
    await rejected;
    expect(sdk.close).toHaveBeenCalledOnce();
  });

  it('rejects a pre-aborted request before calling chat', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
    });

    const thrown = await collect(
      provider.stream(request({ signal: controller.signal })),
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ModelProviderError);
    expect(thrown).toMatchObject({
      kind: 'abort',
      stage: 'stream_establishment',
    });
    expect(ollamaClient.chat).not.toHaveBeenCalled();
  });
});
