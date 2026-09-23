import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ModelProviderError,
  type JsonObject,
  type ProviderChunk,
  type ProviderRequest,
} from '@ayunis/inference';

import { azure, openai } from './openai-provider';

const { createMock, responsesCreateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  responsesCreateMock: vi.fn(),
}));

vi.mock('openai', () => {
  class FakeOpenAI {
    chat = { completions: { create: createMock } };
    responses = { create: responsesCreateMock };
  }
  return { default: FakeOpenAI };
});

const request = (signal?: AbortSignal): ProviderRequest => ({
  instructions: '',
  messages: [],
  tools: [],
  ...(signal ? { signal } : {}),
});

const chunk = (text: string) => ({
  choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
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
  responsesCreateMock.mockReset();
});

describe('OpenAI provider error contract', () => {
  it('normalizes stream setup failures and preserves safe provider facts', async () => {
    const cause = Object.assign(new Error('rate limited'), {
      status: 429,
      request_id: 'req_safe-123',
      headers: { 'retry-after': '2' },
    });
    createMock.mockRejectedValueOnce(cause);

    const provider = openai({ apiKey: 'test', model: 'gpt-test' });

    await expect(drain(provider.stream(request()))).rejects.toMatchObject({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'req_safe-123',
      retryAfterMs: 2_000,
      cause,
    });
  });

  it('marks SDK setup timeouts as response-start timeouts', async () => {
    const cause = Object.assign(new Error('timed out'), {
      name: 'APIConnectionTimeoutError',
    });
    createMock.mockRejectedValueOnce(cause);

    const provider = openai({ apiKey: 'test', model: 'gpt-test' });

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
      scriptedStream([value(chunk('partial')), cause], onReturn),
    );
    const iterator = openai({ apiKey: 'test', model: 'gpt-test' })
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
    const cause = new Error('local conversion failed');
    const input = {
      toJSON: () => {
        throw cause;
      },
    } as unknown as JsonObject;
    const localRequest: ProviderRequest = {
      instructions: '',
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call-1', name: 'tool', input }],
        },
      ],
      tools: [],
    };

    const provider = openai({ apiKey: 'test', model: 'gpt-test' });

    await expect(drain(provider.stream(localRequest))).rejects.toBe(cause);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('preserves a raw chunk conversion failure over rejecting iterator cleanup', async () => {
    const cause = new Error('invalid local chunk');
    const invalidChunk = new Proxy(
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
      scriptedStream([value(invalidChunk)], onReturn),
    );

    const provider = openai({ apiKey: 'test', model: 'gpt-test' });

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
      openai({ apiKey: 'test', model: 'gpt-test' }).stream(
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
    const pending = openai({ apiKey: 'test', model: 'gpt-test' })
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
    const provider = openai({
      apiKey: 'test',
      model: 'gpt-test',
      maxRetries: 0,
    });

    await drain(provider.stream(request()));

    expect(createMock).toHaveBeenCalledOnce();
  });

  it('surfaces normalized failures as ModelProviderError instances', async () => {
    createMock.mockRejectedValueOnce(new Error('unknown SDK failure'));
    const provider = openai({ apiKey: 'test', model: 'gpt-test' });

    const result = drain(provider.stream(request()));

    await expect(result).rejects.toBeInstanceOf(ModelProviderError);
  });
});

describe('Azure Responses provider error contract', () => {
  const createProvider = () =>
    azure({
      apiKey: 'test',
      endpoint: 'https://resource.openai.azure.com',
      model: 'gpt-test',
    });

  it('normalizes stream setup failures', async () => {
    const cause = Object.assign(new Error('rate limited'), { status: 429 });
    responsesCreateMock.mockRejectedValueOnce(cause);

    await expect(
      drain(createProvider().stream(request())),
    ).rejects.toMatchObject({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      cause,
    });
  });

  it('normalizes failures while consuming response events', async () => {
    const cause = Object.assign(new Error('connection lost'), {
      code: 'ECONNRESET',
    });
    responsesCreateMock.mockResolvedValueOnce(scriptedStream([cause]));

    await expect(
      drain(createProvider().stream(request())),
    ).rejects.toMatchObject({
      kind: 'connection',
      stage: 'stream_consumption',
      cause,
    });
  });
});
