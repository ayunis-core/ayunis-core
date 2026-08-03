import { RunAbortedError, type AgentRuntimeError } from '@ayunis/agent-runtime';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceCompletedEvent } from '../events/inference-completed.event';
import { RuntimeModelProviderDecorator } from './runtime-model-provider.decorator';

const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const orgId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
const model = {
  name: 'claude-3-7-sonnet',
  provider: 'anthropic',
} as LanguageModel;

const request: ProviderRequest = {
  instructions: 'Answer questions for a municipal clerk.',
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
  tools: [],
};

interface Harness {
  decorate: (provider: ModelProvider) => ModelProvider;
  emitAsync: jest.Mock;
}

function buildHarness(): Harness {
  const emitAsync = jest.fn().mockResolvedValue([]);
  const decorator = new RuntimeModelProviderDecorator({
    emitAsync,
  } as unknown as EventEmitter2);
  return {
    decorate: (provider) =>
      decorator.decorate(provider, { userId, orgId, model }),
    emitAsync,
  };
}

async function collect(
  provider: ModelProvider,
  providerRequest: ProviderRequest = request,
): Promise<ProviderChunk[]> {
  const chunks: ProviderChunk[] = [];
  for await (const chunk of provider.stream(providerRequest)) {
    chunks.push(chunk);
  }
  return chunks;
}

function throwingProvider(error: Error): ModelProvider {
  return {
    name: 'test:throwing',
    async *stream() {
      yield await Promise.reject(error);
    },
  };
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function waitForAbort(signal: AbortSignal | undefined): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    const fail = () => reject(abortError());
    if (signal?.aborted) {
      fail();
      return;
    }
    signal?.addEventListener('abort', fail, { once: true });
  });
}

describe('RuntimeModelProviderDecorator', () => {
  it('forwards transformed provider chunks unchanged and records success', async () => {
    const transformedChunk: ProviderChunk = {
      thinkingDelta: 'Checking the municipal code. ',
      textDelta: 'The permit is valid.',
      usage: { inputTokens: 12, outputTokens: 7 },
    };
    const provider: ModelProvider = {
      name: 'test:transformed',
      async *stream() {
        yield transformedChunk;
      },
    };
    const { decorate, emitAsync } = buildHarness();

    const chunks = await collect(decorate(provider));

    expect(chunks).toEqual([transformedChunk]);
    expect(chunks[0]).toBe(transformedChunk);
    expect(emitAsync).toHaveBeenCalledTimes(1);
    expect(emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        userId,
        orgId,
        model: model.name,
        provider: model.provider,
        streaming: true,
        durationMs: expect.any(Number),
        error: undefined,
      }),
    );
  });

  it('strips disallowed nulls from replayed tool calls before provider dispatch', async () => {
    const forwardedRequests: ProviderRequest[] = [];
    const provider: ModelProvider = {
      name: 'test:capturing',
      async *stream(providerRequest) {
        forwardedRequests.push(providerRequest);
        yield { textDelta: 'The record was found.' };
      },
    };
    const replayRequest: ProviderRequest = {
      instructions: request.instructions,
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'records-1',
              name: 'search_municipal_records',
              input: {
                query: '2026 budget amendment',
                endDate: null,
                note: null,
              },
            },
          ],
        },
      ],
      tools: [
        {
          name: 'search_municipal_records',
          description: 'Search municipal records',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              endDate: { type: 'string' },
              note: { type: ['string', 'null'] },
            },
          },
        },
      ],
    };
    const { decorate } = buildHarness();

    await collect(decorate(provider), replayRequest);

    expect(forwardedRequests[0].messages[0].content[0]).toEqual({
      type: 'tool_use',
      id: 'records-1',
      name: 'search_municipal_records',
      input: { query: '2026 budget amendment', note: null },
    });
    expect(replayRequest.messages[0].content[0]).toMatchObject({
      type: 'tool_use',
      input: {
        query: '2026 budget amendment',
        endDate: null,
        note: null,
      },
    });
  });

  it.each([
    [
      'connection failure',
      Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      }),
      'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
      'provider_connection',
    ],
    [
      'transport timeout',
      Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }),
      'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
      'provider_timeout',
    ],
    [
      'upstream server failure',
      Object.assign(new Error('service unavailable'), { status: 503 }),
      'PROVIDER_UNAVAILABLE_SERVER_ANTHROPIC',
      'provider_server',
    ],
    [
      'oversized image',
      Object.assign(new Error('image exceeds 5 MB maximum'), { status: 400 }),
      'INFERENCE_IMAGE_TOO_LARGE',
      'inference_image_too_large',
    ],
    [
      'unknown failure',
      new Error('provider returned an invalid stream'),
      'INFERENCE_FAILED',
      'inference_failed',
    ],
  ])(
    'classifies a %s and records the mapped failure',
    async (_label, error, code, type) => {
      const { decorate, emitAsync } = buildHarness();

      await expect(collect(decorate(throwingProvider(error)))).rejects.toEqual(
        expect.objectContaining({
          code,
          details: {
            hostError: expect.objectContaining({ type }),
          },
        }),
      );

      expect(emitAsync).toHaveBeenCalledTimes(1);
      const event = emitAsync.mock.calls[0][1] as InferenceCompletedEvent;
      expect(event.error?.message).toBeTruthy();
    },
  );

  it('preserves a classified provider failure when cancellation races with it', async () => {
    const controller = new AbortController();
    const connectionFailure = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });
    const provider: ModelProvider = {
      name: 'test:racing-failure',
      async *stream() {
        controller.abort();
        yield await Promise.reject(connectionFailure);
      },
    };
    const { decorate } = buildHarness();

    await expect(
      collect(decorate(provider), {
        ...request,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject<Partial<AgentRuntimeError>>({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
    });
  });

  it('treats a socket error used as the abort reason as cancellation', async () => {
    const controller = new AbortController();
    const socketError = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });
    const provider: ModelProvider = {
      name: 'test:disconnected-client',
      async *stream() {
        controller.abort(socketError);
        yield await Promise.reject(socketError);
      },
    };
    const { decorate } = buildHarness();

    await expect(
      collect(decorate(provider), {
        ...request,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(RunAbortedError);
  });

  it('aborts a stalled provider after the shared inter-chunk timeout', async () => {
    jest.useFakeTimers();
    const provider: ModelProvider = {
      name: 'test:stalling',
      async *stream(providerRequest) {
        yield { textDelta: 'First chunk' };
        await waitForAbort(providerRequest.signal);
      },
    };
    const { decorate, emitAsync } = buildHarness();
    const iterator = decorate(provider).stream(request)[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      value: { textDelta: 'First chunk' },
    });
    const stalled = iterator.next();
    const failure = expect(stalled).rejects.toMatchObject<
      Partial<AgentRuntimeError>
    >({
      code: 'INFERENCE_TIMEOUT',
      details: {
        hostError: {
          type: 'inference_stream_stalled',
          context: { idleMs: STREAM_IDLE_TIMEOUT_MS },
        },
      },
    });
    await jest.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS);

    await failure;
    expect(emitAsync).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('relays client cancellation to the underlying provider request', async () => {
    let providerSignal: AbortSignal | undefined;
    const provider: ModelProvider = {
      name: 'test:cancellable',
      async *stream(providerRequest) {
        providerSignal = providerRequest.signal;
        yield await waitForAbort(providerRequest.signal);
      },
    };
    const controller = new AbortController();
    const { decorate, emitAsync } = buildHarness();
    const iterator = decorate(provider)
      .stream({
        ...request,
        signal: controller.signal,
      })
      [Symbol.asyncIterator]();
    const pending = iterator.next();
    await Promise.resolve();

    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(RunAbortedError);
    expect(providerSignal?.aborted).toBe(true);
    expect(emitAsync).toHaveBeenCalledTimes(1);
  });

  it('records cancellation when the consumer closes an aborted stream', async () => {
    const provider: ModelProvider = {
      name: 'test:consumer-close',
      async *stream() {
        yield { textDelta: 'Partial response' };
        yield { textDelta: 'Unread response' };
      },
    };
    const controller = new AbortController();
    const { decorate, emitAsync } = buildHarness();
    const iterator = decorate(provider)
      .stream({
        ...request,
        signal: controller.signal,
      })
      [Symbol.asyncIterator]();

    await iterator.next();
    controller.abort();
    await iterator.return?.();

    const event = emitAsync.mock.calls[0][1] as InferenceCompletedEvent;
    expect(event.error?.message).toBe('Inference aborted by client');
    expect(emitAsync).toHaveBeenCalledTimes(1);
  });

  it('emits one completion event for every call on a reused provider', async () => {
    const provider: ModelProvider = {
      name: 'test:reused',
      async *stream() {
        yield { textDelta: 'Complete' };
      },
    };
    const { decorate, emitAsync } = buildHarness();
    const decorated = decorate(provider);

    await collect(decorated);
    await collect(decorated);

    expect(emitAsync).toHaveBeenCalledTimes(2);
  });
});
