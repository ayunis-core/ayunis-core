import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

import { bedrock } from './bedrock-provider';

const { bedrockCtor, createMock } = vi.hoisted(() => ({
  bedrockCtor: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('@anthropic-ai/bedrock-sdk', () => {
  class FakeBedrock {
    messages = { create: createMock };

    constructor(options: unknown) {
      bedrockCtor(options);
    }
  }
  return { default: FakeBedrock };
});

const request = (signal?: AbortSignal): ProviderRequest => ({
  instructions: '',
  messages: [],
  tools: [],
  ...(signal ? { signal } : {}),
});

const done = (): IteratorResult<unknown> => ({ done: true, value: undefined });

function failingStream(
  cause: Error,
  onReturn: () => void,
): AsyncIterable<unknown> {
  let emitted = false;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (!emitted) {
            emitted = true;
            return {
              done: false,
              value: {
                type: 'content_block_delta',
                index: 0,
                delta: { type: 'text_delta', text: 'partial' },
              },
            };
          }
          throw cause;
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

beforeEach(() => {
  bedrockCtor.mockReset();
  createMock.mockReset();
});

describe('Bedrock provider error contract', () => {
  it('normalizes setup failures through the shared Anthropic stream core', async () => {
    const cause = Object.assign(new Error('throttled'), {
      statusCode: 429,
      $metadata: { requestId: 'bedrock-request-1' },
    });
    createMock.mockRejectedValueOnce(cause);
    const provider = bedrock({ model: 'anthropic.test', maxRetries: 0 });

    await expect(drain(provider.stream(request()))).rejects.toMatchObject({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      upstreamRequestId: 'bedrock-request-1',
      cause,
    });
    expect(createMock).toHaveBeenCalledOnce();
  });

  it('normalizes post-chunk failures and cleans up the Bedrock iterator', async () => {
    const cause = Object.assign(new Error('socket closed'), {
      code: 'UND_ERR_SOCKET',
    });
    const onReturn = vi.fn();
    createMock.mockResolvedValueOnce(failingStream(cause, onReturn));
    const iterator = bedrock({ model: 'anthropic.test', maxRetries: 0 })
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

  it('passes the request signal to Bedrock and opens one SDK stream', async () => {
    const controller = new AbortController();
    createMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]() {
        return {
          next: async () => done(),
          return: async () => done(),
        };
      },
    });
    const provider = bedrock({ model: 'anthropic.test', maxRetries: 0 });

    await drain(provider.stream(request(controller.signal)));

    expect(createMock).toHaveBeenCalledOnce();
    expect(createMock.mock.calls[0]?.[1]).toEqual({
      signal: controller.signal,
    });
    expect(bedrockCtor).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0 }),
    );
  });
});
