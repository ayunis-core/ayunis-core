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
        upstreamCode: 'invalid_function_parameters',
        upstreamParam: 'tools[0].function.parameters',
        toolSchemaBytes: expect.any(Number),
        toolSetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      'Provider stream inference failed',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('classified');
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
