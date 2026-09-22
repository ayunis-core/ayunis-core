import { createLoggerMock } from 'src/common/testing/logger.mock';
import {
  DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS,
  ModelProviderError,
  RunContext,
  run,
  type ModelProvider,
  type ProviderFailureFacts,
  type RunEvent,
  type RunEventPayload,
} from '@ayunis/agent-runtime';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import {
  InferenceFailedError,
  InferenceImageTooLargeError,
} from 'src/domain/models/application/models.errors';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import {
  RunAnonymizationUnavailableError,
  RunContextBudgetExceededError,
  RunMaxIterationsReachedError,
  RunToolRepeatedlyFailingError,
  type RunExecutionFailedError,
} from 'src/domain/runs/application/runs.errors';
import { adaptRunEventsToStream } from './run-event-stream.adapter';
import { THREAD_PII_MASKS_EVENT } from './masks-event';
import { RuntimeModelRegistry } from './runtime-model.registry';
import { ModelCallObservabilityHookFactory } from './hooks/model-call-observability-hook.factory';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

function stamp(payload: RunEventPayload): RunEvent {
  return {
    ...payload,
    runId: 'run-1',
    depth: 0,
    path: ['run-1'],
    timestamp: '2026-07-17T00:00:00.000Z',
  };
}

async function* eventsFrom(
  payloads: RunEventPayload[],
): AsyncIterable<RunEvent> {
  for (const payload of payloads) {
    yield stamp(payload);
  }
}

async function collect(
  events: AsyncIterable<RunEvent>,
  logger = createLoggerMock(),
  models?: RuntimeModelRegistry,
): Promise<RunStreamItem[]> {
  const items: RunStreamItem[] = [];
  for await (const item of adaptRunEventsToStream(
    events,
    threadId,
    logger,
    undefined,
    models,
  )) {
    items.push(item);
  }
  return items;
}

function runtimeModels(
  runtimeProviderName = 'anthropic:claude-sonnet-4-5',
): RuntimeModelRegistry {
  const registry = new RuntimeModelRegistry();
  registry.register(
    {
      name: runtimeProviderName,
      stream: () => {
        throw new Error('Runtime provider is not called by adapter tests');
      },
    },
    {
      name: 'claude-sonnet-4-5',
      provider: 'anthropic',
    } as LanguageModel,
  );
  return registry;
}

async function collectWithOutcome(events: AsyncIterable<RunEvent>) {
  const generator = adaptRunEventsToStream(
    events,
    threadId,
    createLoggerMock(),
  );
  const items: RunStreamItem[] = [];
  for (;;) {
    const next = await generator.next();
    if (next.done) return { items, outcome: next.value };
    items.push(next.value);
  }
}

describe('adaptRunEventsToStream', () => {
  it('returns the aborted terminal outcome without mapping it to an error', async () => {
    const result = await collectWithOutcome(
      eventsFrom([
        { type: 'run_start', maxIterations: 20 },
        { type: 'run_end', status: 'aborted', usage: {} },
      ]),
    );

    expect(result).toEqual({ items: [], outcome: 'aborted' });
  });

  it('accumulates text deltas into a growing assistant message with a stable id', async () => {
    const items = await collect(
      eventsFrom([
        { type: 'run_start', maxIterations: 20 },
        { type: 'text_delta', delta: 'Hel' },
        { type: 'text_delta', delta: 'lo' },
        {
          type: 'assistant_message',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hello' }],
          },
          usage: { inputTokens: 1, outputTokens: 1 },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    expect(items).toHaveLength(3);
    const [tick1, tick2, final] = items as AssistantMessage[];
    expect((tick1.content[0] as TextMessageContent).text).toBe('Hel');
    expect((tick2.content[0] as TextMessageContent).text).toBe('Hello');
    // streamed ticks and the authoritative message share one id
    expect(tick1.id).toBe(tick2.id);
    expect(final.id).toBe(tick1.id);
    expect((final.content[0] as TextMessageContent).text).toBe('Hello');
  });

  it('streams growing tool-only messages while split arguments arrive', async () => {
    const items = await collect(
      eventsFrom([
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 0,
            id: 'c1',
            name: 'search',
            argumentsJson: '{"query":',
            input: null,
            status: 'streaming',
          },
        },
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 0,
            id: 'c1',
            name: 'search',
            argumentsJson: '{"query":"budget"}',
            input: { query: 'budget' },
            status: 'streaming',
          },
        },
        {
          type: 'assistant_message',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'c1',
                name: 'search',
                input: { query: 'budget' },
              },
            ],
          },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    const [partial, complete, final] = items as AssistantMessage[];
    expect(items).toHaveLength(3);
    expect(partial.id).toBe(complete.id);
    expect(final.id).toBe(partial.id);
    expect((partial.content[0] as ToolUseMessageContent).params).toEqual({});
    expect((partial.content[0] as ToolUseMessageContent).stream).toEqual({
      status: 'streaming',
      argumentsJson: '{"query":',
    });
    expect((complete.content[0] as ToolUseMessageContent).params).toEqual({
      query: 'budget',
    });
    expect((final.content[0] as ToolUseMessageContent).params).toEqual({
      query: 'budget',
    });
    expect((final.content[0] as ToolUseMessageContent).stream).toBeUndefined();
  });

  it('keeps an invalid terminal tool call visible beside finalized text', async () => {
    const items = await collect(
      eventsFrom([
        { type: 'text_delta', delta: 'I will search for that.' },
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 0,
            id: 'c1',
            name: 'internet_search',
            argumentsJson: '{"query":',
            input: null,
            status: 'streaming',
          },
        },
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 0,
            id: 'c1',
            name: 'internet_search',
            argumentsJson: '{"query":',
            input: null,
            status: 'invalid',
          },
        },
        {
          type: 'assistant_message',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'I will search for that.' }],
          },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    const final = items.at(-1) as AssistantMessage;
    const invalidCall = final.content.find(
      (content) => content instanceof ToolUseMessageContent,
    ) as ToolUseMessageContent;
    expect(invalidCall.stream).toEqual({
      status: 'invalid',
      argumentsJson: '{"query":',
    });
  });

  it('accumulates concurrent tool calls independently in index order', async () => {
    const items = await collect(
      eventsFrom([
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 1,
            id: 'c2',
            name: 'lookup',
            argumentsJson: '{"id":2}',
            input: { id: 2 },
            status: 'streaming',
          },
        },
        {
          type: 'tool_call_snapshot',
          toolCall: {
            index: 0,
            id: 'c1',
            name: 'search',
            argumentsJson: '{"query":"one"}',
            input: { query: 'one' },
            status: 'streaming',
          },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    const latest = items.at(-1) as AssistantMessage;
    const calls = latest.content as ToolUseMessageContent[];
    expect(calls.map((call) => call.id)).toEqual(['c1', 'c2']);
    expect(calls.map((call) => call.params)).toEqual([
      { query: 'one' },
      { id: 2 },
    ]);
  });

  it('maps a tool_result_message to a backend ToolResultMessage', async () => {
    const items = await collect(
      eventsFrom([
        {
          type: 'tool_result_message',
          message: {
            role: 'tool_result',
            content: [
              {
                type: 'tool_result',
                toolCallId: 'c1',
                toolName: 'search',
                result: 'done',
              },
            ],
          },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(ToolResultMessage);
  });

  it('maps a mask custom event to RunPiiMasksUpdate', async () => {
    const masks = [{ token: '{{pii:PERSON_1}}' }];
    const items = await collect(
      eventsFrom([
        { type: 'custom', name: THREAD_PII_MASKS_EVENT, data: masks },
        { type: 'custom', name: 'unrelated', data: {} },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(RunPiiMasksUpdate);
    expect((items[0] as RunPiiMasksUpdate).masks).toBe(masks);
  });

  it('throws RunMaxIterationsReachedError only after draining the stream', async () => {
    const seen: string[] = [];
    async function* events(): AsyncIterable<RunEvent> {
      yield stamp({
        type: 'error',
        code: 'MAX_ITERATIONS_REACHED',
        message: 'too many',
        details: { maxIterations: 7 },
      });
      seen.push('after-error');
      yield stamp({ type: 'run_end', status: 'max_iterations', usage: {} });
      seen.push('after-run-end');
    }

    await expect(collect(events())).rejects.toBeInstanceOf(
      RunMaxIterationsReachedError,
    );
    // the generator was fully drained before the error surfaced
    expect(seen).toEqual(['after-error', 'after-run-end']);
  });

  it('surfaces a critical hook failure with its execution path', async () => {
    const logger = createLoggerMock();
    const result = collect(
      eventsFrom([
        {
          type: 'error',
          code: 'HOOK_FAILED',
          message:
            "Hook 'ayunis-persistence' failed in afterModelTurn: database unavailable",
          details: {
            hookName: 'ayunis-persistence',
            phase: 'afterModelTurn',
            originalOutcome: 'accepted',
            underlyingError: { code: 'USAGE_PERSISTENCE_FAILED' },
          },
        },
        { type: 'run_end', status: 'error', usage: {} },
      ]),
      logger,
    );

    await expect(result).rejects.toMatchObject<
      Partial<RunExecutionFailedError>
    >({
      code: 'RUN_EXECUTION_FAILED',
      metadata: {
        hookName: 'ayunis-persistence',
        phase: 'afterModelTurn',
        originalOutcome: 'accepted',
        underlyingErrorCode: 'USAGE_PERSISTENCE_FAILED',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ execution_path: 'agent_runtime' }),
      'Critical agent runtime hook failed',
    );
  });

  it('surfaces a critical finalization failure with its execution path', async () => {
    const logger = createLoggerMock();
    const result = collect(
      eventsFrom([
        {
          type: 'error',
          code: 'MAX_ITERATIONS_REACHED',
          message: 'too many',
          details: { maxIterations: 7 },
        },
        {
          type: 'finalization_error',
          hookName: 'ayunis-persistence',
          message: 'database unavailable',
          critical: true,
          outcome: 'max_iterations',
        },
        { type: 'run_end', status: 'max_iterations', usage: {} },
      ]),
    );

    await expect(result).rejects.toMatchObject<
      Partial<RunExecutionFailedError>
    >({
      code: 'RUN_EXECUTION_FAILED',
      metadata: {
        hookName: 'ayunis-persistence',
        phase: 'runEnd',
        originalOutcome: 'max_iterations',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ execution_path: 'agent_runtime' }),
      'Critical agent runtime finalization hook failed',
    );
  });

  it('preserves the max outcome for a best-effort finalization failure', async () => {
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'MAX_ITERATIONS_REACHED',
            message: 'too many',
            details: { maxIterations: 7 },
          },
          {
            type: 'finalization_error',
            hookName: 'telemetry',
            message: 'collector unavailable',
            critical: false,
            outcome: 'max_iterations',
          },
          { type: 'run_end', status: 'max_iterations', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(RunMaxIterationsReachedError);
  });

  it('maps other error events to a client-safe run error', async () => {
    const logger = createLoggerMock();
    const details = { provider: 'test-provider', statusCode: 503 };

    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'PROVIDER_FAILED',
            message: 'upstream exposed internal provider details',
            details,
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toMatchObject<Partial<RunExecutionFailedError>>({
      message: 'Run execution failed: Agent runtime failed',
    });
    expect(logger.error).toHaveBeenCalledWith(
      {
        code: 'PROVIDER_FAILED',
        message: 'upstream exposed internal provider details',
        details,
      },
      'Agent runtime failed',
    );
  });

  it.each([
    [
      'connection',
      {
        kind: 'connection' as const,
        stage: 'stream_establishment' as const,
        transportCode: 'ECONNREFUSED',
        host: 'api.anthropic.com',
      },
      ProviderConnectionError,
      'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
    ],
    [
      'provider timeout',
      {
        kind: 'timeout' as const,
        stage: 'stream_consumption' as const,
        timeoutSource: 'whole_stream' as const,
      },
      ProviderTimeoutError,
      'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
    ],
    [
      'server failure',
      {
        kind: 'server' as const,
        stage: 'stream_establishment' as const,
        upstreamStatus: 503,
        upstreamRequestId: 'req_anthropic_503',
      },
      ProviderServerError,
      'PROVIDER_UNAVAILABLE_SERVER_ANTHROPIC',
    ],
    [
      'rate limit',
      {
        kind: 'rate_limit' as const,
        stage: 'stream_establishment' as const,
        upstreamStatus: 429,
        upstreamRequestId: 'req_anthropic_429',
        retryAfterMs: 12_000,
      },
      ProviderRequestRejectedError,
      'PROVIDER_UNAVAILABLE_REJECTED_ANTHROPIC',
    ],
  ])(
    'maps a portable %s using actual backend model metadata',
    async (_label, providerFailure, ErrorType, code) => {
      const facts: ProviderFailureFacts = providerFailure;
      const models = runtimeModels();
      const result = collect(
        eventsFrom([
          {
            type: 'error',
            code: 'PROVIDER_FAILED',
            message: 'Model provider request failed',
            modelCall: {
              modelCallId: 'call-1',
              runId: 'run-1',
              turn: 1,
              callSequence: 1,
              trigger: 'initial',
              provider: 'anthropic:claude-sonnet-4-5',
            },
            providerFailure: facts,
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
        createLoggerMock(),
        models,
      );

      const error: unknown = await result.catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ErrorType);
      expect(error).toMatchObject({
        code,
        metadata: expect.objectContaining({
          provider: 'anthropic',
          modelId: 'claude-sonnet-4-5',
          failureStage: facts.stage,
          ...(facts.upstreamStatus !== undefined && {
            upstreamStatus: facts.upstreamStatus,
          }),
          ...(facts.upstreamRequestId && {
            upstreamRequestId: facts.upstreamRequestId,
          }),
          ...(facts.retryAfterMs !== undefined && {
            retryAfterMs: facts.retryAfterMs,
          }),
        }),
      });
    },
  );

  it('preserves a runtime-owned idle stall as InferenceStreamStalledError', async () => {
    const result = collect(
      eventsFrom([
        {
          type: 'error',
          code: 'PROVIDER_FAILED',
          message: `Model provider stream was idle for ${DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS}ms`,
          modelCall: {
            modelCallId: 'call-stalled',
            runId: 'run-1',
            turn: 1,
            callSequence: 1,
            trigger: 'initial',
            provider: 'anthropic:claude-sonnet-4-5',
          },
          providerFailure: {
            kind: 'timeout',
            stage: 'stream_consumption',
          },
        },
        { type: 'run_end', status: 'error', usage: {} },
      ]),
      createLoggerMock(),
      runtimeModels(),
    );

    await expect(result).rejects.toMatchObject({
      code: 'INFERENCE_TIMEOUT',
      statusCode: 504,
    });
  });

  it('maps an oversized-image runtime outcome recorded by observability', async () => {
    const provider: ModelProvider = {
      name: 'anthropic:claude-sonnet-4-5',
      async *stream() {
        yield await Promise.reject(
          new ModelProviderError({
            kind: 'rejection',
            stage: 'stream_establishment',
            upstreamStatus: 400,
            cause: new Error('image exceeds 5 MB maximum'),
          }),
        );
      },
    };
    const context = RunContext.create();
    const models = RuntimeModelRegistry.attach(context);
    models.register(provider, {
      name: 'claude-sonnet-4-5',
      provider: 'anthropic',
    } as LanguageModel);
    const observability = new ModelCallObservabilityHookFactory({
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as EventEmitter2).create({
      userId: '223e4567-e89b-12d3-a456-426614174000',
      orgId: '323e4567-e89b-12d3-a456-426614174000',
      models,
    });
    const result = collect(
      run({
        instructions: 'Inspect the submitted image.',
        model: provider,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Inspect this image.' }],
          },
        ],
        context,
        hooks: [observability],
        retry: { maxRetries: 0 },
      }),
      createLoggerMock(),
      models,
    );

    await expect(result).rejects.toBeInstanceOf(InferenceImageTooLargeError);
  });

  it('keeps an ordinary portable rejection in the inference-failed incident family', async () => {
    const result = collect(
      eventsFrom([
        {
          type: 'error',
          code: 'PROVIDER_FAILED',
          message: 'Model provider request failed',
          modelCall: {
            modelCallId: 'call-rejected',
            runId: 'run-1',
            turn: 1,
            callSequence: 1,
            trigger: 'initial',
            provider: 'anthropic:claude-sonnet-4-5',
          },
          providerFailure: {
            kind: 'rejection',
            stage: 'stream_establishment',
            upstreamStatus: 400,
            upstreamRequestId: 'req_anthropic_400',
          },
        },
        { type: 'run_end', status: 'error', usage: {} },
      ]),
      createLoggerMock(),
      runtimeModels(),
    );

    await expect(result).rejects.toMatchObject({
      code: 'INFERENCE_FAILED',
      metadata: expect.objectContaining({
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5',
        status: 400,
        upstreamRequestId: 'req_anthropic_400',
      }),
    });
  });

  it.each([
    [
      'provider connection error',
      'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
      {
        type: 'provider_connection',
        context: {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet',
          underlyingCode: 'ECONNREFUSED',
          causeMessage: 'connect ECONNREFUSED',
        },
      },
      ProviderConnectionError,
      502,
      {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet',
        underlyingCode: 'ECONNREFUSED',
      },
    ],
    [
      'provider timeout error',
      'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
      {
        type: 'provider_timeout',
        context: {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet',
          underlyingCode: 'ETIMEDOUT',
          failureStage: 'stream_establishment',
          timeoutSource: 'response_start',
        },
      },
      ProviderTimeoutError,
      504,
      {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet',
        underlyingCode: 'ETIMEDOUT',
        failureStage: 'stream_establishment',
        timeoutSource: 'response_start',
      },
    ],
    [
      'provider server error',
      'PROVIDER_UNAVAILABLE_SERVER_ANTHROPIC',
      {
        type: 'provider_server',
        context: {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet',
          upstreamStatus: 503,
        },
      },
      ProviderServerError,
      502,
      {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet',
        upstreamStatus: 503,
      },
    ],
    [
      'provider request rejection',
      'PROVIDER_UNAVAILABLE_REJECTED_ANTHROPIC',
      {
        type: 'provider_rejected',
        context: {
          provider: 'anthropic',
          modelId: 'claude-3-7-sonnet',
          upstreamStatus: 429,
          retryAfterMs: 30_000,
        },
      },
      ProviderRequestRejectedError,
      502,
      {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet',
        upstreamStatus: 429,
        retryAfterMs: 30_000,
      },
    ],
  ])(
    'reconstructs a classified %s',
    async (_label, code, hostError, ErrorType, statusCode, metadata) => {
      const result = collect(
        eventsFrom([
          {
            type: 'error',
            code,
            message: 'Serialized host error',
            details: { hostError },
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      );

      const error: unknown = await result.catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ErrorType);
      expect(error).toMatchObject({ code, statusCode, metadata });
    },
  );

  it('maps a malformed tool call to the inference-failed error', async () => {
    // Truncated/unparseable tool-call arguments must surface as one clear
    // inference failure instead of a generic runtime error (AYC-646).
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'MALFORMED_TOOL_CALL',
            message:
              'Model emitted a tool call whose arguments did not arrive intact',
            details: {
              toolNames: ['create_document'],
              reason: 'unparseable_arguments',
            },
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('maps a repeatedly failing tool to the transcript-preserving run error', async () => {
    // Must be the RunToolRepeatedlyFailingError subclass — the runtime
    // use case skips transcript cleanup based on that type.
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'TOOL_REPEATEDLY_FAILING',
            message:
              "Tool 'create_document' failed 3 consecutive times with the same error",
            details: { toolName: 'create_document', failureCount: 3 },
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(RunToolRepeatedlyFailingError);
  });

  it('maps anonymization failures to the privacy-safe run error', async () => {
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'ANONYMIZATION_UNAVAILABLE',
            message: 'Anonymization is unavailable',
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(RunAnonymizationUnavailableError);
  });

  // The user keeps the privacy-safe run code, but the classified provider
  // failure serialized into details must be rebuilt as `cause` so
  // reportUnexpectedError groups the incident under
  // PROVIDER_UNAVAILABLE_TIMEOUT_ANONYMIZE (AYC-654).
  it('rebuilds a classified anonymize outage as the run error cause', async () => {
    const result = collect(
      eventsFrom([
        {
          type: 'error',
          code: 'ANONYMIZATION_UNAVAILABLE',
          message: 'Anonymization is unavailable',
          details: {
            hostError: {
              type: 'provider_timeout',
              context: { provider: 'anonymize' },
            },
          },
        },
        { type: 'run_end', status: 'error', usage: {} },
      ]),
    );

    const error: unknown = await result.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RunAnonymizationUnavailableError);
    expect((error as Error).cause).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANONYMIZE',
    });
  });

  it('maps an oversized latest turn to a context-budget error', async () => {
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'CONTEXT_BUDGET_EXCEEDED',
            message: 'The latest turn exceeds the context budget',
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(RunContextBudgetExceededError);
  });
});
