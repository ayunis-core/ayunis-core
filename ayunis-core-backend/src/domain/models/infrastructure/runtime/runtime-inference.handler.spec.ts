import { ModelProviderError, type ModelProvider } from '@ayunis/inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { InferenceInput } from 'src/domain/models/application/ports/inference.handler';
import type { InferenceCallTerminalHandler } from 'src/domain/models/application/models/inference-call-terminal';
import { InferenceTokenLimitError } from 'src/domain/models/application/models.errors';
import { RuntimeInferenceHandler } from './runtime-inference.handler';

class TestHandler extends RuntimeInferenceHandler {
  constructor(private readonly provider: ModelProvider) {
    super({} as ImageContentService);
  }
  protected createProvider(): ModelProvider {
    return this.provider;
  }
}

function makeInput(
  onCallTerminal?: InferenceCallTerminalHandler,
): InferenceInput {
  return {
    model: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'test-model',
      provider: 'test',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    messages: [],
    tools: [],
    orgId: 'org-1',
    onCallTerminal,
  } as unknown as InferenceInput;
}

function countingProvider(stream: ModelProvider['stream']): {
  provider: ModelProvider;
  calls: () => number;
} {
  let calls = 0;
  return {
    provider: {
      name: 'test:counting',
      stream: (request) => {
        calls += 1;
        return stream(request);
      },
    },
    calls: () => calls,
  };
}

describe('RuntimeInferenceHandler', () => {
  it('reports folded usage once after a completed call', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const { provider } = countingProvider(async function* () {
      yield { textDelta: 'answer' };
      yield {
        finishReason: 'stop',
        usage: {
          inputTokens: 3,
          outputTokens: 2,
          cacheReadInputTokens: 11,
          cacheWriteInputTokens: 5,
        },
      };
    });

    const response = await new TestHandler(provider).answer(
      makeInput(terminal),
    );

    expect(response.meta).toEqual({
      inputTokens: 19,
      outputTokens: 2,
      totalTokens: 21,
    });
    expect(terminal).toHaveBeenCalledTimes(1);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'completed',
      usage: { inputTokens: 19, outputTokens: 2 },
    });
  });

  it('makes exactly one provider call and reports nothing for a failure before output', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const failure = new ModelProviderError({
      kind: 'rate_limit',
      stage: 'stream_establishment',
      upstreamStatus: 429,
      retryAfterMs: 1_000,
      cause: new Error('rate limited'),
    });
    const { provider, calls } = countingProvider(async function* () {
      yield await Promise.reject(failure);
    });

    await expect(
      new TestHandler(provider).answer(makeInput(terminal)),
    ).rejects.toBe(failure);
    expect(calls()).toBe(1);
    expect(terminal).not.toHaveBeenCalled();
  });

  it('reports usage of a consumed call that failed and keeps the provider failure', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const failure = Object.assign(new Error('service unavailable'), {
      status: 503,
    });
    const { provider, calls } = countingProvider(async function* () {
      yield {
        textDelta: 'partial',
        usage: { inputTokens: 7, outputTokens: 3 },
      };
      throw failure;
    });

    await expect(
      new TestHandler(provider).answer(makeInput(terminal)),
    ).rejects.toBe(failure);
    expect(calls()).toBe(1);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'failed',
      usage: { inputTokens: 7, outputTokens: 3 },
    });
  });

  it('reports usage of a completed call rejected as a truncated tool call', async () => {
    const terminal = jest.fn<
      Promise<void>,
      Parameters<InferenceCallTerminalHandler>
    >();
    const { provider } = countingProvider(async function* () {
      yield {
        toolCallDeltas: [{ index: 0, id: 'call-1', name: 'create_document' }],
      };
      yield {
        finishReason: 'length',
        usage: { inputTokens: 4, outputTokens: 9 },
      };
    });

    await expect(
      new TestHandler(provider).answer(makeInput(terminal)),
    ).rejects.toBeInstanceOf(InferenceTokenLimitError);
    expect(terminal).toHaveBeenCalledWith({
      outcome: 'failed',
      usage: { inputTokens: 4, outputTokens: 9 },
    });
  });

  it('fails the call when terminal accounting rejects', async () => {
    const accountingError = new Error('provider usage missing');
    const { provider } = countingProvider(async function* () {
      yield { textDelta: 'answer', finishReason: 'stop' };
    });

    await expect(
      new TestHandler(provider).answer(
        makeInput(() => Promise.reject(accountingError)),
      ),
    ).rejects.toBe(accountingError);
  });
});
