import {
  ModelProviderError,
  run,
  type ModelProvider,
  type ProviderChunk,
  type RunEvent,
} from '@ayunis/agent-runtime';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceCompletedEvent } from 'src/domain/runs/application/events/inference-completed.event';
import { RuntimeModelRegistry } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import { ModelCallObservabilityHookFactory } from './model-call-observability-hook.factory';

const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const orgId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
const model = {
  name: 'claude-sonnet-4-5',
  provider: 'anthropic',
} as LanguageModel;
const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Summarize the permit.' }],
  },
];

const createDocumentTool = {
  name: 'create_document',
  description: 'Create a document',
  parameters: {
    type: 'object',
    properties: { title: { type: 'string' } },
  },
};

async function collect(events: AsyncIterable<RunEvent>): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

function buildHook(provider: ModelProvider, emitAsync = jest.fn()) {
  const models = new RuntimeModelRegistry();
  models.register(provider, model);
  const factory = new ModelCallObservabilityHookFactory({
    emitAsync,
  } as unknown as EventEmitter2);
  return {
    emitAsync,
    models,
    hook: factory.create({ userId, orgId, models }),
  };
}

describe('ModelCallObservabilityHookFactory', () => {
  it('emits one completion event with identity and outcome for every actual call', async () => {
    let call = 0;
    const provider: ModelProvider = {
      name: 'anthropic:claude-sonnet-4-5',
      async *stream(): AsyncIterable<ProviderChunk> {
        call += 1;
        if (call === 1) {
          throw new ModelProviderError({
            kind: 'server',
            stage: 'stream_establishment',
            upstreamStatus: 503,
            upstreamRequestId: 'req_anthropic_503',
            cause: new Error('upstream internal details'),
          });
        }
        yield {
          textDelta: 'The permit is valid.',
          finishReason: 'stop',
        };
      },
    };
    const { emitAsync, hook } = buildHook(
      provider,
      jest.fn().mockResolvedValue([]),
    );

    await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        hooks: [hook],
        retry: {
          maxRetries: 1,
          backoff: { initialDelayMs: 0, maxDelayMs: 0 },
        },
      }),
    );

    const completed = emitAsync.mock.calls.map(
      (entry) => entry[1] as InferenceCompletedEvent,
    );
    expect(completed).toHaveLength(2);
    expect(completed.map((event) => event.outcome)).toEqual([
      'provider_failure',
      'accepted',
    ]);
    expect(completed.map((event) => event.trigger)).toEqual([
      'initial',
      'provider_retry',
    ]);
    expect(completed[0].modelCallId).not.toBe(completed[1].modelCallId);
    expect(completed[0]).toMatchObject({
      userId,
      orgId,
      model: model.name,
      provider: model.provider,
      streaming: true,
      executionPath: 'agent_runtime',
      runId: expect.any(String),
      turn: 1,
      callSequence: 1,
      durationMs: expect.any(Number),
    });
  });

  it('uses the backend model registered for the actual child-call provider', async () => {
    const rootProvider = {
      name: 'anthropic:root-model',
      stream: jest.fn(),
    } as unknown as ModelProvider;
    const childProvider = {
      name: 'azure:child-model',
      stream: jest.fn(),
    } as unknown as ModelProvider;
    const childModel = {
      name: 'child-model',
      provider: 'azure',
    } as LanguageModel;
    const { hook, models, emitAsync } = buildHook(
      rootProvider,
      jest.fn().mockResolvedValue([]),
    );
    models.register(childProvider, childModel);

    await hook.afterModelCall!({
      model: childProvider,
      modelCallId: 'child-call-1',
      runId: 'child-run-1',
      turn: 1,
      callSequence: 1,
      trigger: 'initial',
      outcome: {
        type: 'accepted',
        model: childProvider,
        modelCallId: 'child-call-1',
        runId: 'child-run-1',
        turn: 1,
        callSequence: 1,
        trigger: 'initial',
        message: { role: 'assistant', content: [] },
        usage: {},
        finishReason: 'stop',
        outputState: 'final',
        providerConsumptionStarted: true,
        producedOutput: false,
        visibleOutput: false,
        durationMs: 25,
      },
    } as never);

    expect(emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        model: childModel.name,
        provider: childModel.provider,
        modelCallId: 'child-call-1',
      }),
    );
  });

  it('logs privacy-safe request and rejection diagnostics', async () => {
    const logger = createLoggerMock();
    const provider: ModelProvider = {
      name: 'anthropic:claude-sonnet-4-5',
      async *stream() {
        const rejection = new ModelProviderError({
          kind: 'rejection',
          stage: 'stream_establishment',
          upstreamStatus: 400,
          upstreamRequestId: 'req_anthropic_400',
          cause: Object.assign(
            new Error("Invalid schema echoed resident prompt 'classified'"),
            {
              status: 400,
              code: 'invalid_function_parameters',
              param: 'tools[0].function.parameters',
            },
          ),
        });
        yield await Promise.reject(rejection);
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        tools: [
          {
            name: 'search_municipal_records',
            description: 'Search municipal records',
            parameters: { type: 'object', properties: {} },
          },
        ],
        hooks: [hook],
        retry: { maxRetries: 0 },
      }),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        model: model.name,
        provider: model.provider,
        upstreamStatus: 400,
        upstreamRequestId: 'req_anthropic_400',
        callSequence: 1,
        providerConsumptionStarted: false,
        producedOutput: false,
        visibleOutput: false,
        upstreamCode: 'invalid_function_parameters',
        upstreamParam: 'tools[0].function.parameters',
        upstreamMessage: "Invalid schema echoed resident prompt '…",
        toolSchemaBytes: expect.any(Number),
        toolSetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      'Provider stream inference failed',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'Summarize the permit.',
    );
  });

  it('logs the bounded upstream message when the provider is unavailable', async () => {
    const logger = createLoggerMock();
    const provider: ModelProvider = {
      name: 'anthropic:claude-sonnet-4-5',
      async *stream() {
        yield await Promise.reject(
          new ModelProviderError({
            kind: 'server',
            stage: 'stream_establishment',
            upstreamStatus: 503,
            cause: new Error('503 Service  overloaded,\n  retry later'),
          }),
        );
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        hooks: [hook],
        retry: { maxRetries: 0 },
      }),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        failureKind: 'server',
        upstreamStatus: 503,
        upstreamMessage: '503 Service overloaded, retry later',
      }),
      'Provider unavailable during runtime inference',
    );
  });

  it('logs that a terminal mid-stream rate limit had already reached the user', async () => {
    const logger = createLoggerMock();
    let calls = 0;
    const provider: ModelProvider = {
      name: 'azure:gpt-5.6-terra',
      async *stream() {
        calls += 1;
        yield { thinkingDelta: 'Considering the permit' };
        throw new ModelProviderError({
          kind: 'rate_limit',
          stage: 'stream_consumption',
          upstreamStatus: 429,
          retryAfterMs: 3_000,
          cause: new Error('limited'),
        });
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    const events = await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        hooks: [hook],
        retry: { maxRetries: 3, backoff: { initialDelayMs: 0 } },
      }),
    );

    expect(calls).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        failureKind: 'rate_limit',
        failureStage: 'stream_consumption',
        trigger: 'initial',
        callSequence: 1,
        providerConsumptionStarted: true,
        producedOutput: true,
        visibleOutput: true,
        retryAfterMs: 3_000,
      }),
      'Provider unavailable during runtime inference',
    );
  });

  it('logs a retried rate limit as not yet visible and with its attempt position', async () => {
    const logger = createLoggerMock();
    let calls = 0;
    const provider: ModelProvider = {
      name: 'azure:gpt-5.6-sol',
      async *stream() {
        calls += 1;
        if (calls === 1) {
          throw new ModelProviderError({
            kind: 'rate_limit',
            stage: 'stream_consumption',
            upstreamStatus: 429,
            retryAfterMs: 0,
            cause: new Error('limited'),
          });
        }
        yield { textDelta: 'Recovered.', finishReason: 'stop' };
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    const events = await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        hooks: [hook],
        retry: { maxRetries: 1 },
      }),
    );

    expect(calls).toBe(2);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        failureKind: 'rate_limit',
        failureStage: 'stream_consumption',
        trigger: 'initial',
        callSequence: 1,
        providerConsumptionStarted: false,
        producedOutput: false,
        visibleOutput: false,
        retryAfterMs: 0,
      }),
      'Provider unavailable during runtime inference',
    );
  });

  it('logs a terminal malformed tool call that followed visible output', async () => {
    const logger = createLoggerMock();
    let calls = 0;
    const provider: ModelProvider = {
      name: 'azure:gpt-5.6-terra',
      async *stream() {
        calls += 1;
        yield { textDelta: 'Ich lege das Dokument an.' };
        yield {
          toolCallDeltas: [
            { index: 0, id: 'call_bad', name: 'create_document' },
          ],
        };
        yield {
          toolCallDeltas: [
            { index: 0, argumentsDelta: '{"title":"Haushaltsplan Ent' },
          ],
        };
        yield {
          finishReason: 'tool_calls' as const,
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    const events = await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        tools: [createDocumentTool],
        hooks: [hook],
      }),
    );

    expect(calls).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      {
        model: model.name,
        provider: model.provider,
        modelCallId: expect.any(String),
        trigger: 'initial',
        callSequence: 1,
        providerConsumptionStarted: true,
        producedOutput: true,
        visibleOutput: true,
        rejectionReason: 'malformed',
        malformedReason: 'unparseable_arguments',
        toolNames: ['create_document'],
        contentTypes: ['text'],
        finishReason: 'tool_calls',
        inputTokens: 0,
        outputTokens: 0,
        durationMs: expect.any(Number),
      },
      'Model call rejected',
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'Haushaltsplan',
    );
  });

  it('logs each rejected attempt through a failed tool-disabled fallback', async () => {
    const logger = createLoggerMock();
    const provider: ModelProvider = {
      name: 'stackit:gpt-oss-120b',
      async *stream(request) {
        yield {
          toolCallDeltas: [
            { index: 0, id: 'call_bad', name: 'create_document' },
          ],
        };
        yield {
          toolCallDeltas: [
            {
              index: 0,
              argumentsDelta:
                request.tools.length > 0 ? '{"title":' : '{"title":"Plan"}',
            },
          ],
        };
        yield {
          finishReason: 'tool_calls' as const,
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      },
    };
    const { hook } = buildHook(provider, jest.fn().mockResolvedValue([]));

    await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        tools: [createDocumentTool],
        hooks: [hook],
        retry: { maxRetries: 2 },
      }),
    );

    expect(
      logger.warn.mock.calls.map(([context]) => {
        const { trigger, callSequence, visibleOutput, rejectionReason } =
          context as Record<string, unknown>;
        return { trigger, callSequence, visibleOutput, rejectionReason };
      }),
    ).toEqual([
      {
        trigger: 'initial',
        callSequence: 1,
        visibleOutput: false,
        rejectionReason: 'malformed',
      },
      {
        trigger: 'malformed_recovery',
        callSequence: 2,
        visibleOutput: false,
        rejectionReason: 'malformed',
      },
      {
        trigger: 'fallback',
        callSequence: 3,
        visibleOutput: false,
        rejectionReason: 'invalid_fallback',
      },
    ]);
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.objectContaining({ malformedReason: 'tool_disabled_fallback' }),
      'Model call rejected',
    );
  });

  it('does not let completion-event listener failures affect execution', async () => {
    const logger = createLoggerMock();
    const provider: ModelProvider = {
      name: 'anthropic:claude-sonnet-4-5',
      async *stream() {
        yield { textDelta: 'Completed.', finishReason: 'stop' as const };
      },
    };
    const { hook } = buildHook(
      provider,
      jest.fn().mockRejectedValue(new Error('metrics listener unavailable')),
    );

    const events = await collect(
      run({
        instructions: 'Assist a municipal clerk.',
        model: provider,
        messages,
        hooks: [hook],
      }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(logger.error).toHaveBeenCalledWith(
      { error: 'metrics listener unavailable' },
      'Failed to emit InferenceCompletedEvent',
    );
  });
});
