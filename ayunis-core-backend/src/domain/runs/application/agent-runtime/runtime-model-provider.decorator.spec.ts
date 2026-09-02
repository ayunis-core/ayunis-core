import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { RunAbortedError, type AgentRuntimeError } from '@ayunis/agent-runtime';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { STREAM_IDLE_TIMEOUT_MS } from 'src/common/streaming/stream-idle-watchdog';
import { SETUP_RETRY_BACKOFF_MS } from 'src/common/errors/provider-transport-error.classifier';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceCompletedEvent } from 'src/domain/runs/application/events/inference-completed.event';
import { RuntimeModelProviderDecorator } from './runtime-model-provider.decorator';
import type { RuntimeToolIntegrationRegistry } from './runtime-tool-integration.registry';

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
  logger: ReturnType<typeof createPinoLoggerMock>;
}

function buildHarness(
  runtimeModel: LanguageModel = model,
  toolIntegrations?: RuntimeToolIntegrationRegistry,
): Harness {
  const emitAsync = jest.fn().mockResolvedValue([]);
  const logger = createPinoLoggerMock();
  const decorator = new RuntimeModelProviderDecorator(
    {
      emitAsync,
    } as unknown as EventEmitter2,
    logger,
  );
  return {
    decorate: (provider) =>
      decorator.decorate(provider, {
        userId,
        orgId,
        model: runtimeModel,
        ...(toolIntegrations ? { toolIntegrations } : {}),
      }),
    emitAsync,
    logger,
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
        executionPath: 'agent_runtime',
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

  // Connection failures get one setup retry (AYC-653), so they record two
  // model-call completions; everything else fails on the first attempt.
  it.each([
    [
      'connection failure',
      Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      }),
      'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
      'provider_connection',
      2,
    ],
    [
      'transport timeout',
      Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }),
      'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
      'provider_timeout',
      2,
    ],
    [
      'upstream server failure',
      Object.assign(new Error('service unavailable'), { status: 503 }),
      'PROVIDER_UNAVAILABLE_SERVER_ANTHROPIC',
      'provider_server',
      3,
    ],
    [
      'oversized image',
      Object.assign(new Error('image exceeds 5 MB maximum'), { status: 400 }),
      'INFERENCE_IMAGE_TOO_LARGE',
      'inference_image_too_large',
      1,
    ],
    [
      'unknown failure',
      new Error('provider returned an invalid stream'),
      'INFERENCE_FAILED',
      'inference_failed',
      1,
    ],
  ])(
    'classifies a %s and records the mapped failure',
    async (_label, error, code, type, attempts) => {
      jest.useFakeTimers();
      const { decorate, emitAsync } = buildHarness();

      const collected = collect(decorate(throwingProvider(error)));
      const failure = expect(collected).rejects.toEqual(
        expect.objectContaining({
          code,
          details: {
            hostError: expect.objectContaining({ type }),
          },
        }),
      );
      await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS * 3);
      await failure;

      expect(emitAsync).toHaveBeenCalledTimes(attempts);
      const event = emitAsync.mock.calls[
        attempts - 1
      ][1] as InferenceCompletedEvent;
      expect(event.error?.message).toBeTruthy();
      jest.useRealTimers();
    },
  );

  it('recovers on the third attempt after repeated upstream server failures', async () => {
    jest.useFakeTimers();
    let attempts = 0;
    const upstream = Object.assign(new Error('internal server error'), {
      status: 500,
    });
    const provider: ModelProvider = {
      name: 'test:bedrock-recovery',
      async *stream() {
        attempts += 1;
        if (attempts < 3) {
          yield await Promise.reject(upstream);
        }
        yield { textDelta: 'Recovered response' };
      },
    };
    const bedrockModel = {
      name: 'claude-sonnet-4',
      provider: 'bedrock',
    } as LanguageModel;
    const { decorate } = buildHarness(bedrockModel);

    const collected = collect(decorate(provider));
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS * 3);

    await expect(collected).resolves.toEqual([
      { textDelta: 'Recovered response' },
    ]);
    expect(attempts).toBe(3);
    jest.useRealTimers();
  });

  it('logs safe diagnostics for Azure server failures', async () => {
    const upstream = Object.assign(new Error('service unavailable'), {
      status: 503,
      requestID: 'req_azure_503',
    });
    const azureModel = {
      name: 'gpt-5.6-luna',
      provider: 'azure',
    } as LanguageModel;
    const toolIntegrations = {
      get: (toolName: string) =>
        toolName === 'search_municipal_records'
          ? {
              id: '323e4567-e89b-12d3-a456-426614174000',
              name: 'Municipal Records MCP',
              logoUrl: null,
            }
          : undefined,
    } as RuntimeToolIntegrationRegistry;
    const providerRequest: ProviderRequest = {
      ...request,
      tools: [
        {
          name: 'search_municipal_records',
          description: 'Search municipal records',
          parameters: { type: 'object', properties: {} },
        },
      ],
      toolChoice: 'auto',
    };
    const { decorate, logger } = buildHarness(azureModel, toolIntegrations);

    await expect(
      collect(decorate(throwingProvider(upstream)), providerRequest),
    ).rejects.toThrow('Provider azure returned a server error');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'azure',
        modelId: 'gpt-5.6-luna',
        upstreamStatus: 503,
        upstreamRequestId: 'req_azure_503',
        toolSchemaBytes: expect.any(Number),
        toolSetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        tools: [
          {
            name: 'search_municipal_records',
            schemaHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            mcpIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
            mcpIntegrationName: 'Municipal Records MCP',
          },
        ],
      }),
      'Provider unavailable during runtime inference',
    );
  });

  it('records safe provider diagnostics without the raw provider message', async () => {
    const upstream = Object.assign(
      new Error("Invalid schema containing resident prompt 'classified text'"),
      {
        status: 400,
        code: 'invalid_function_parameters',
        type: 'invalid_request_error',
        param: 'tools[62].function.parameters',
        request_id: 'req_azure_123',
      },
    );
    const { decorate, logger } = buildHarness();

    const result = collect(decorate(throwingProvider(upstream)));

    await expect(result).rejects.toMatchObject({
      details: {
        hostError: {
          context: {
            upstreamStatus: 400,
            upstreamCode: 'invalid_function_parameters',
            upstreamType: 'invalid_request_error',
            upstreamParam: 'tools[62].function.parameters',
            upstreamRequestId: 'req_azure_123',
            upstreamReason: 'invalid_tool_schema',
          },
        },
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        upstreamCode: 'invalid_function_parameters',
        upstreamParam: 'tools[62].function.parameters',
        upstreamReason: 'invalid_tool_schema',
      }),
      'Provider stream inference failed',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'classified text',
    );
  });

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

  it('retries once when the stream stalls before any content', async () => {
    jest.useFakeTimers();
    let calls = 0;
    const provider: ModelProvider = {
      name: 'test:stalls-then-recovers',
      async *stream(providerRequest) {
        calls += 1;
        if (calls === 1) {
          // Usage arrives, then the provider goes silent — nothing the user
          // can see was produced, so the retry is invisible.
          yield { usage: { inputTokens: 2048 } };
          await waitForAbort(providerRequest.signal);
          return;
        }
        yield { textDelta: 'Die Antwort nach dem zweiten Anlauf.' };
      },
    };
    const { decorate, emitAsync } = buildHarness();
    const iterator = decorate(provider).stream(request)[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      value: { usage: { inputTokens: 2048 } },
    });
    const nextChunk = iterator.next();
    await jest.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS);
    await expect(nextChunk).resolves.toMatchObject({
      value: { textDelta: 'Die Antwort nach dem zweiten Anlauf.' },
    });
    await expect(iterator.next()).resolves.toMatchObject({ done: true });

    expect(calls).toBe(2);
    // Each provider attempt emits its own completion event.
    expect(emitAsync).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
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

  it('retries once when a transient connection failure happens before the first chunk', async () => {
    jest.useFakeTimers();
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
        yield { textDelta: 'Recovered' };
      },
    };
    const { decorate } = buildHarness();

    const collected = collect(decorate(provider));
    await jest.advanceTimersByTimeAsync(SETUP_RETRY_BACKOFF_MS);

    await expect(collected).resolves.toEqual([{ textDelta: 'Recovered' }]);
    expect(calls).toBe(2);
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
