import {
  AgentRuntimeError,
  MalformedToolCallError,
  ProviderError,
  RunAbortedError,
} from '../contracts/errors';
import type { RunEventPayload, ToolCallSnapshot } from '../contracts/event';
import type { ModelCallIdentity, ModelCallOutcome } from '../contracts/hook';
import { ModelProviderError } from '../contracts/provider';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderFailureFacts,
  ProviderRequest,
} from '../contracts/provider';
import type { ModelCallResult } from './accumulator';
import { ChunkAccumulator } from './accumulator';
import { IdleTimeoutError, type ModelCallScope } from './model-call-scope';
import type { ModelCallMode } from './request-snapshot';

interface ModelCallParams {
  identity: ModelCallIdentity;
  model: ModelProvider;
  request: ProviderRequest;
  mode: ModelCallMode;
  scope: ModelCallScope;
  record: { outcome?: ModelCallOutcome };
  onFinished: (outcome: ModelCallOutcome) => Promise<void>;
}

interface ModelCallExecution {
  readonly accumulator: ChunkAccumulator;
  readonly bufferedSnapshots: RunEventPayload[];
  readonly startedAt: number;
  iterator?: AsyncIterator<ProviderChunk>;
  completed: boolean;
  iteratorReadPending: boolean;
  visibleOutput: boolean;
  consumptionStarted: boolean;
  outcome?: ModelCallOutcome;
}

export async function* streamModelCall(
  params: ModelCallParams,
): AsyncGenerator<RunEventPayload, ModelCallOutcome> {
  const execution = createExecution();
  try {
    execution.outcome = yield* performModelCall(params, execution);
    return execution.outcome;
  } catch (error) {
    execution.outcome = failedExecutionOutcome(params, execution, error);
    return execution.outcome;
  } finally {
    await finalizeExecution(params, execution);
  }
}

async function* performModelCall(
  params: ModelCallParams,
  execution: ModelCallExecution,
): AsyncGenerator<RunEventPayload, ModelCallOutcome> {
  params.scope.start();
  execution.iterator = openIterator(params.model, params.request);
  const collected = yield* collectChunks(
    collectParams(params, execution, execution.iterator),
  );
  execution.completed = true;
  return yield* completedOutcome(params, collected, execution);
}

const createExecution = (): ModelCallExecution => ({
  accumulator: new ChunkAccumulator(),
  bufferedSnapshots: [],
  startedAt: Date.now(),
  completed: false,
  iteratorReadPending: false,
  visibleOutput: false,
  consumptionStarted: false,
});

const collectParams = (
  params: ModelCallParams,
  execution: ModelCallExecution,
  iterator: AsyncIterator<ProviderChunk>,
): CollectParams => ({
  iterator,
  accumulator: execution.accumulator,
  scope: params.scope,
  bufferedSnapshots: execution.bufferedSnapshots,
  markVisible: () => {
    execution.visibleOutput = true;
  },
  isVisible: () => execution.visibleOutput,
  markConsumptionStarted: () => {
    execution.consumptionStarted = true;
  },
  markIteratorReadPending: (pending) => {
    execution.iteratorReadPending = pending;
  },
  suppressSnapshots: params.mode === 'tool_disabled_fallback',
});

const failedExecutionOutcome = (
  params: ModelCallParams,
  execution: ModelCallExecution,
  error: unknown,
): ModelCallOutcome =>
  failureOutcome({
    params,
    result: execution.accumulator.partialResult(),
    visibleOutput: execution.visibleOutput,
    consumptionStarted: execution.consumptionStarted,
    startedAt: execution.startedAt,
    error,
  });

const finalizeExecution = async (
  params: ModelCallParams,
  execution: ModelCallExecution,
): Promise<void> => {
  const outcome = execution.outcome ?? abandonedOutcome(params, execution);
  if (!execution.completed && execution.iterator) {
    await closeIterator(execution.iterator, !execution.iteratorReadPending);
  }
  params.record.outcome = outcome;
  params.scope.dispose();
  await params.onFinished(outcome);
};

const abandonedOutcome = (
  params: ModelCallParams,
  execution: ModelCallExecution,
): ModelCallOutcome => {
  params.scope.abandon();
  return consumerOutcome(
    params,
    execution.accumulator.partialResult(),
    execution.visibleOutput,
    execution.startedAt,
  );
};

interface CollectParams {
  iterator: AsyncIterator<ProviderChunk>;
  accumulator: ChunkAccumulator;
  scope: ModelCallScope;
  bufferedSnapshots: RunEventPayload[];
  markVisible: () => void;
  isVisible: () => boolean;
  markConsumptionStarted: () => void;
  markIteratorReadPending: (pending: boolean) => void;
  suppressSnapshots: boolean;
}

async function* collectChunks(
  params: CollectParams,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  for (;;) {
    params.markIteratorReadPending(true);
    const operation = Promise.resolve().then(() => params.iterator.next());
    const settled = (): void => params.markIteratorReadPending(false);
    void operation.then(settled, settled);
    const next = await params.scope.wait(operation);
    if (next.done) return params.accumulator.finalize();
    params.scope.notifyChunk();
    params.markConsumptionStarted();
    const snapshots = params.accumulator.accept(next.value);
    yield* contentEvents(params, next.value);
    yield* snapshotEvents(params, snapshots);
  }
}

function* contentEvents(
  params: CollectParams,
  chunk: ProviderChunk,
): Generator<RunEventPayload> {
  if (chunk.thinkingDelta) {
    yield* revealBuffered(params);
    yield { type: 'thinking_delta', delta: chunk.thinkingDelta };
  }
  if (chunk.textDelta) {
    yield* revealBuffered(params);
    yield { type: 'text_delta', delta: chunk.textDelta };
  }
}

function* snapshotEvents(
  params: CollectParams,
  snapshots: readonly ToolCallSnapshot[],
): Generator<RunEventPayload> {
  if (params.suppressSnapshots) return;
  for (const toolCall of snapshots) {
    const event: RunEventPayload = { type: 'tool_call_snapshot', toolCall };
    if (params.isVisible()) yield event;
    else params.bufferedSnapshots.push(event);
  }
}

function* revealBuffered(params: CollectParams): Generator<RunEventPayload> {
  params.markVisible();
  yield* params.bufferedSnapshots;
  params.bufferedSnapshots.length = 0;
}

function* completedOutcome(
  params: ModelCallParams,
  result: ModelCallResult,
  execution: ModelCallExecution,
): Generator<RunEventPayload, ModelCallOutcome> {
  const malformed = malformedError(result);
  if (malformed) {
    if (execution.visibleOutput) yield* invalidSnapshots(result);
    return rejectedOutcome({
      params,
      result,
      reason: 'malformed',
      error: malformed,
      visibleOutput: execution.visibleOutput,
      startedAt: execution.startedAt,
    });
  }
  return yield* completeValidOutput(params, result, execution);
}

function* completeValidOutput(
  params: ModelCallParams,
  result: ModelCallResult,
  execution: ModelCallExecution,
): Generator<RunEventPayload, ModelCallOutcome> {
  if (params.mode === 'tool_disabled_fallback' && hasToolUse(result)) {
    return rejectedOutcome({
      params,
      result,
      reason: 'invalid_fallback',
      error: invalidFallbackError(result),
      visibleOutput: execution.visibleOutput,
      startedAt: execution.startedAt,
    });
  }
  if (result.message.content.length === 0) {
    return rejectedOutcome({
      params,
      result,
      reason: 'empty',
      error: new ProviderError('Model provider returned an empty response'),
      visibleOutput: execution.visibleOutput,
      startedAt: execution.startedAt,
    });
  }
  yield* revealCompletedSnapshots(execution);
  return {
    ...baseOutcome(
      params,
      result,
      execution.visibleOutput,
      execution.startedAt,
    ),
    type: 'accepted',
    outputState: 'final',
  };
}

function* revealCompletedSnapshots(
  execution: ModelCallExecution,
): Generator<RunEventPayload> {
  for (const event of execution.bufferedSnapshots) {
    execution.visibleOutput = true;
    yield event;
  }
  execution.bufferedSnapshots.length = 0;
}

const invalidFallbackError = (
  result: ModelCallResult,
): MalformedToolCallError =>
  new MalformedToolCallError(
    {
      toolNames: result.message.content
        .filter((content) => content.type === 'tool_use')
        .map((content) => content.name),
      reason: 'tool_disabled_fallback',
    },
    { usage: result.usage },
  );

const malformedError = (
  result: ModelCallResult,
): MalformedToolCallError | undefined => {
  if (result.invalidToolCallSnapshots.length > 0) {
    return new MalformedToolCallError(
      {
        toolNames: result.invalidToolCallSnapshots.map((call) => call.name),
        reason: 'unparseable_arguments',
      },
      { usage: result.usage },
    );
  }
  const names = result.message.content
    .filter((content) => content.type === 'tool_use')
    .map((content) => content.name);
  return result.finishReason === 'length' && names.length > 0
    ? new MalformedToolCallError(
        { toolNames: names, reason: 'token_limit_reached' },
        { usage: result.usage },
      )
    : undefined;
};

function* invalidSnapshots(
  result: ModelCallResult,
): Generator<RunEventPayload> {
  for (const toolCall of result.invalidToolCallSnapshots) {
    yield { type: 'tool_call_snapshot', toolCall };
  }
}

interface RejectedOutcomeParams {
  params: ModelCallParams;
  result: ModelCallResult;
  reason: 'empty' | 'malformed' | 'invalid_fallback';
  error: AgentRuntimeError;
  visibleOutput: boolean;
  startedAt: number;
}

const rejectedOutcome = (options: RejectedOutcomeParams): ModelCallOutcome => ({
  ...baseOutcome(
    options.params,
    options.result,
    options.visibleOutput,
    options.startedAt,
  ),
  type: 'rejected',
  outputState: 'final',
  reason: options.reason,
  error: options.error,
});

interface FailureOutcomeOptions {
  params: ModelCallParams;
  result: ModelCallResult;
  visibleOutput: boolean;
  consumptionStarted: boolean;
  startedAt: number;
  error: unknown;
}

const failureOutcome = (options: FailureOutcomeOptions): ModelCallOutcome => {
  const { params, result, visibleOutput, startedAt, error } = options;
  if (params.scope.source === 'consumer') {
    return consumerOutcome(params, result, visibleOutput, startedAt);
  }
  if (isAbort(error, params.scope)) {
    return {
      ...baseOutcome(params, result, visibleOutput, startedAt),
      type: 'aborted',
      outputState: 'partial',
      error: toAbortError(error),
    };
  }
  const failure = providerFailure(
    error,
    params.scope,
    options.consumptionStarted,
  );
  return {
    ...baseOutcome(params, result, visibleOutput, startedAt),
    type: 'provider_failure',
    outputState: 'partial',
    error: failure.error,
    providerFailure: failure.facts,
  };
};

const consumerOutcome = (
  params: ModelCallParams,
  result: ModelCallResult,
  visibleOutput: boolean,
  startedAt: number,
): ModelCallOutcome => ({
  ...baseOutcome(params, result, visibleOutput, startedAt),
  type: 'consumer_abandoned',
  outputState: 'partial',
});

type ModelCallOutcomeBase = Omit<
  Extract<ModelCallOutcome, { type: 'accepted' }>,
  'type' | 'outputState'
>;

const baseOutcome = (
  params: ModelCallParams,
  result: ModelCallResult,
  visibleOutput: boolean,
  startedAt: number,
): ModelCallOutcomeBase => ({
  ...params.identity,
  message: result.message,
  usage: result.usage,
  finishReason: result.finishReason,
  providerConsumptionStarted: result.providerConsumptionStarted,
  producedOutput: result.producedOutput,
  visibleOutput,
  durationMs: Date.now() - startedAt,
});

const providerFailure = (
  error: unknown,
  scope: ModelCallScope,
  consumptionStarted: boolean,
): { error: AgentRuntimeError; facts: ProviderFailureFacts } => {
  if (error instanceof ModelProviderError) {
    const facts = factsFromProviderError(error);
    return {
      error: new ProviderError(error.message, error, facts),
      facts,
    };
  }
  const stage = consumptionStarted
    ? 'stream_consumption'
    : 'stream_establishment';
  if (error instanceof IdleTimeoutError || scope.source === 'idle') {
    const idleError =
      error instanceof IdleTimeoutError ? error : new IdleTimeoutError(0);
    const facts: ProviderFailureFacts = { kind: 'timeout', stage };
    return { error: new ProviderError(idleError.message, error, facts), facts };
  }
  const facts: ProviderFailureFacts = { kind: 'unknown', stage };
  return { error: toUnknownProviderError(error, facts), facts };
};

const toUnknownProviderError = (
  error: unknown,
  facts: ProviderFailureFacts,
): AgentRuntimeError => {
  if (error instanceof AgentRuntimeError) return error;
  const message =
    error instanceof Error ? error.message : 'Model provider failed';
  return new ProviderError(message, error, facts);
};

const factsFromProviderError = (
  error: ModelProviderError,
): ProviderFailureFacts => ({
  kind: error.kind,
  stage: error.stage,
  ...(error.upstreamStatus !== undefined
    ? { upstreamStatus: error.upstreamStatus }
    : {}),
  ...(error.upstreamRequestId
    ? { upstreamRequestId: error.upstreamRequestId }
    : {}),
  ...(error.retryAfterMs !== undefined
    ? { retryAfterMs: error.retryAfterMs }
    : {}),
  ...(error.timeoutSource ? { timeoutSource: error.timeoutSource } : {}),
  ...(error.transportCode ? { transportCode: error.transportCode } : {}),
  ...(error.host ? { host: error.host } : {}),
});

const isAbort = (error: unknown, scope: ModelCallScope): boolean => {
  if (scope.source === 'idle') return false;
  if (scope.source === 'external' || scope.source === 'hook') return true;
  if (error instanceof RunAbortedError) return true;
  if (error instanceof ModelProviderError) {
    return error.kind === 'abort' && scope.signal.aborted;
  }
  return error instanceof DOMException && error.name === 'AbortError';
};

const toAbortError = (error: unknown): AgentRuntimeError =>
  error instanceof AgentRuntimeError
    ? error
    : new RunAbortedError('Run aborted during model call');

const hasToolUse = (result: ModelCallResult): boolean =>
  result.message.content.some((content) => content.type === 'tool_use');

const openIterator = (
  model: ModelProvider,
  request: ProviderRequest,
): AsyncIterator<ProviderChunk> =>
  model.stream(request)[Symbol.asyncIterator]();

const closeIterator = async (
  iterator: AsyncIterator<ProviderChunk>,
  awaitCleanup: boolean,
): Promise<void> => {
  let cleanup: Promise<IteratorResult<ProviderChunk>> | undefined;
  try {
    cleanup = iterator.return?.();
  } catch {
    return;
  }
  if (!cleanup) return;
  const observed = cleanup.catch(() => undefined);
  if (awaitCleanup) await observed;
};
