import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ModelProviderError,
  type ProviderChunk,
  type ProviderRequest,
} from '@ayunis/inference';

import { anthropic } from './anthropic-provider';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    messages = { create: createMock };
  }
  return { default: FakeAnthropic };
});

const request = (signal?: AbortSignal): ProviderRequest => ({
  instructions: '',
  messages: [],
  tools: [],
  ...(signal ? { signal } : {}),
});

const textEvent = (text: string) => ({
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text },
});

const done = (): IteratorResult<unknown> => ({ done: true, value: undefined });
const value = (item: unknown): IteratorResult<unknown> => ({
  done: false,
  value: item,
});

function scriptedStream(
  steps: readonly (IteratorResult<unknown> | Error)[],
  onReturn = vi.fn(),
): AsyncIterable<unknown> {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          const step = steps[index++] ?? done();
          if (step instanceof Error) throw step;
          return step;
        },
        async return() {
          onReturn();
          return done();
        },
      };
    },
  };
}

async function drain(
  stream: AsyncIterable<ProviderChunk>,
): Promise<ProviderChunk[]> {
  const chunks: ProviderChunk[] = [];
  for await (const item of stream) chunks.push(item);
  return chunks;
}

const rejectOnAbort = (
  signal?: AbortSignal,
): Promise<IteratorResult<unknown>> =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener(
      'abort',
      () => reject(new DOMException('aborted', 'AbortError')),
      { once: true },
    );
  });

beforeEach(() => {
  createMock.mockReset();
});

describe('Anthropic provider error contract', () => {
  it('normalizes stream setup failures and preserves safe provider facts', async () => {
    const cause = Object.assign(new Error('overloaded'), {
      status: 529,
      request_id: 'req_safe-456',
      headers: { 'retry-after-ms': '250' },
    });
    createMock.mockRejectedValueOnce(cause);

    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    await expect(drain(provider.stream(request()))).rejects.toMatchObject({
      kind: 'server',
      stage: 'stream_establishment',
      upstreamStatus: 529,
      upstreamRequestId: 'req_safe-456',
      retryAfterMs: 250,
      cause,
    });
  });

  it('marks SDK setup timeouts as response-start timeouts', async () => {
    const cause = Object.assign(new Error('timed out'), {
      name: 'APIConnectionTimeoutError',
    });
    createMock.mockRejectedValueOnce(cause);

    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    await expect(drain(provider.stream(request()))).rejects.toMatchObject({
      kind: 'timeout',
      stage: 'stream_establishment',
      timeoutSource: 'response_start',
      cause,
    });
  });

  it('preserves a normalized next failure over a rejecting iterator cleanup', async () => {
    const cause = Object.assign(new Error('connection lost'), {
      code: 'ECONNRESET',
    });
    const cleanupError = new Error('cleanup failed');
    const onReturn = vi.fn(() => {
      throw cleanupError;
    });
    createMock.mockResolvedValueOnce(
      scriptedStream([value(textEvent('partial')), cause], onReturn),
    );
    const iterator = anthropic({ apiKey: 'test', model: 'claude-test' })
      .stream(request())
      [Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { textDelta: 'partial' },
    });
    await expect(iterator.next()).rejects.toMatchObject({
      kind: 'connection',
      stage: 'stream_consumption',
      cause,
    });
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it('keeps local request conversion failures raw and does not open a stream', async () => {
    const localRequest: ProviderRequest = {
      instructions: '',
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: 'unsigned' }],
        },
      ],
      tools: [],
    };
    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    await expect(drain(provider.stream(localRequest))).rejects.toEqual(
      new Error(
        'Cannot build an Anthropic request: all messages converted to empty content',
      ),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('preserves a raw chunk conversion failure over rejecting iterator cleanup', async () => {
    const cause = new Error('invalid local chunk');
    const invalidEvent = new Proxy(
      {},
      {
        get() {
          throw cause;
        },
      },
    );
    const cleanupError = new Error('cleanup failed');
    const onReturn = vi.fn(() => {
      throw cleanupError;
    });
    createMock.mockResolvedValueOnce(
      scriptedStream([value(invalidEvent)], onReturn),
    );

    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    await expect(drain(provider.stream(request()))).rejects.toBe(cause);
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it('passes abort through stream setup and reports the setup abort', async () => {
    const controller = new AbortController();
    createMock.mockImplementationOnce(
      (_params: unknown, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const pending = drain(
      anthropic({ apiKey: 'test', model: 'claude-test' }).stream(
        request(controller.signal),
      ),
    );

    controller.abort();

    await expect(pending).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_establishment',
    });
    expect(createMock.mock.calls[0]?.[1]).toEqual({
      signal: controller.signal,
    });
  });

  it('passes abort through active consumption and cleans up promptly', async () => {
    const controller = new AbortController();
    const onReturn = vi.fn();
    const onNext = vi.fn();
    createMock.mockImplementationOnce(
      (_params: unknown, options?: { signal?: AbortSignal }) => ({
        [Symbol.asyncIterator]() {
          return {
            next: () => {
              onNext();
              return rejectOnAbort(options?.signal);
            },
            return: async () => {
              onReturn();
              return done();
            },
          };
        },
      }),
    );
    const pending = anthropic({ apiKey: 'test', model: 'claude-test' })
      .stream(request(controller.signal))
      [Symbol.asyncIterator]()
      .next();

    await vi.waitFor(() => expect(onNext).toHaveBeenCalledOnce());
    controller.abort();

    await expect(pending).rejects.toMatchObject({
      kind: 'abort',
      stage: 'stream_consumption',
    });
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it('opens one SDK stream for one invocation when maxRetries is zero', async () => {
    createMock.mockResolvedValueOnce(scriptedStream([]));
    const provider = anthropic({
      apiKey: 'test',
      model: 'claude-test',
      maxRetries: 0,
    });

    await drain(provider.stream(request()));

    expect(createMock).toHaveBeenCalledOnce();
  });

  it('surfaces normalized failures as ModelProviderError instances', async () => {
    createMock.mockRejectedValueOnce(new Error('unknown SDK failure'));
    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    const result = drain(provider.stream(request()));

    await expect(result).rejects.toBeInstanceOf(ModelProviderError);
  });
});
