import { MalformedToolCallError, RunAbortedError } from '../contracts/errors';
import type { RunEventPayload } from '../contracts/event';
import type { Usage } from '../contracts/provider';
import type { ModelCallResult } from './accumulator';

const MAX_MALFORMED_ATTEMPTS = 3;
const MAX_EMPTY_ATTEMPTS = 2;
const MAX_TOTAL_ATTEMPTS = MAX_MALFORMED_ATTEMPTS + MAX_EMPTY_ATTEMPTS - 1;

export type ModelCallMode = 'normal' | 'tool_disabled_fallback';

export interface ModelCallRecoveryOptions {
  call: (
    mode: ModelCallMode,
  ) => AsyncGenerator<RunEventPayload, ModelCallResult, void>;
  afterCompleted: (result: ModelCallResult) => Promise<void>;
  onRejectedCompleted: (result: ModelCallResult) => Promise<void>;
  recordUsage: (usage: Usage) => void;
  applyPendingMutations: () => void;
  isAborted: () => boolean;
}

/**
 * Applies bounded recovery to one logical model turn. Empty and malformed
 * responses share one total-attempt budget, so their retries cannot multiply.
 */
export async function* callModelWithRecovery(
  options: ModelCallRecoveryOptions,
): AsyncGenerator<RunEventPayload, ModelCallResult, void> {
  let emptyAttempts = 0;
  let malformedAttempts = 0;
  let mode: ModelCallMode = 'normal';
  let fallbackError: MalformedToolCallError | undefined;

  for (
    let totalAttempt = 1;
    totalAttempt <= MAX_TOTAL_ATTEMPTS;
    totalAttempt++
  ) {
    const outcome: ModelAttemptOutcome = yield* runAttempt(
      options.call(mode),
      mode,
    );
    if (outcome.type === 'failed') {
      const retry: FailedAttemptRetry = yield* recoverFailedAttempt({
        outcome,
        mode,
        fallbackError,
        malformedAttempts,
        totalAttempt,
        options,
      });
      malformedAttempts = retry.malformedAttempts;
      mode = retry.mode;
      fallbackError = retry.fallbackError;
      continue;
    }

    const { result } = outcome;
    await processCompletedAttempt(options, mode, fallbackError, result);
    if (result.message.content.length > 0) return result;

    emptyAttempts++;
    if (options.isAborted()) throw new RunAbortedError();
    if (shouldStopEmptyRecovery(emptyAttempts, totalAttempt)) return result;
    options.applyPendingMutations();
  }

  throw new Error('Model-call recovery exhausted without an outcome');
}

async function processCompletedAttempt(
  options: ModelCallRecoveryOptions,
  mode: ModelCallMode,
  fallbackError: MalformedToolCallError | undefined,
  result: ModelCallResult,
): Promise<void> {
  options.recordUsage(result.usage);
  const rejectedFallback = fallbackToolCallError(mode, fallbackError, result);
  if (rejectedFallback) {
    await options.onRejectedCompleted(result);
    throw rejectedFallback;
  }
  await options.afterCompleted(result);
  if (
    mode === 'tool_disabled_fallback' &&
    fallbackError &&
    result.message.content.length === 0
  ) {
    throw fallbackError;
  }
}

function fallbackToolCallError(
  mode: ModelCallMode,
  fallbackError: MalformedToolCallError | undefined,
  result: ModelCallResult,
): MalformedToolCallError | undefined {
  if (mode !== 'tool_disabled_fallback' || !fallbackError) return undefined;
  return result.message.content.some((content) => content.type === 'tool_use')
    ? fallbackError
    : undefined;
}

type ToolSnapshotEvent = Extract<
  RunEventPayload,
  { type: 'tool_call_snapshot' }
>;

interface ModelAttemptState {
  readonly bufferedToolSnapshots: ToolSnapshotEvent[];
  emittedVisibleContent: boolean;
}

type ModelAttemptOutcome =
  | { type: 'completed'; result: ModelCallResult }
  | { type: 'failed'; error: unknown; state: ModelAttemptState };

type FailedOutcome = Extract<ModelAttemptOutcome, { type: 'failed' }>;

type FailedAttemptAction =
  | { type: 'retry'; malformedAttempts: number }
  | {
      type: 'fallback';
      error: MalformedToolCallError;
      malformedAttempts: number;
    }
  | { type: 'abort'; malformedAttempts: number }
  | {
      type: 'fail';
      error: unknown;
      bufferedToolSnapshots: readonly ToolSnapshotEvent[];
      malformedAttempts: number;
    };

interface FailedAttemptParams {
  readonly outcome: FailedOutcome;
  readonly mode: ModelCallMode;
  readonly fallbackError: MalformedToolCallError | undefined;
  readonly malformedAttempts: number;
  readonly totalAttempt: number;
  readonly options: ModelCallRecoveryOptions;
}

interface FailedAttemptRetry {
  readonly malformedAttempts: number;
  readonly mode: ModelCallMode;
  readonly fallbackError: MalformedToolCallError | undefined;
}

function* recoverFailedAttempt(
  params: FailedAttemptParams,
): Generator<RunEventPayload, FailedAttemptRetry, void> {
  const action = failedAttemptAction(params);
  switch (action.type) {
    case 'retry':
      return {
        malformedAttempts: action.malformedAttempts,
        mode: params.mode,
        fallbackError: params.fallbackError,
      };
    case 'fallback':
      return {
        malformedAttempts: action.malformedAttempts,
        mode: 'tool_disabled_fallback',
        fallbackError: action.error,
      };
    case 'abort':
      throw new RunAbortedError();
    case 'fail':
      yield* action.bufferedToolSnapshots;
      throw action.error;
  }
}

function failedAttemptAction(params: FailedAttemptParams): FailedAttemptAction {
  const malformedAttempts = recordMalformedAttempt(
    params.outcome.error,
    params.malformedAttempts,
    params.options.recordUsage,
  );
  if (
    params.outcome.error instanceof RunAbortedError ||
    isAbortedMalformed(params.outcome.error, params.options)
  ) {
    return { type: 'abort', malformedAttempts };
  }
  if (params.mode === 'tool_disabled_fallback' && params.fallbackError) {
    return {
      type: 'fail',
      error: params.fallbackError,
      bufferedToolSnapshots: [],
      malformedAttempts,
    };
  }
  if (
    canRetryMalformed(params.outcome, malformedAttempts, params.totalAttempt)
  ) {
    return { type: 'retry', malformedAttempts };
  }
  if (canUseToolDisabledFallback(params.outcome, params.totalAttempt)) {
    return {
      type: 'fallback',
      error: params.outcome.error,
      malformedAttempts,
    };
  }
  return {
    type: 'fail',
    error: params.outcome.error,
    bufferedToolSnapshots: params.outcome.state.bufferedToolSnapshots,
    malformedAttempts,
  };
}

async function* runAttempt(
  generator: AsyncGenerator<RunEventPayload, ModelCallResult, void>,
  mode: ModelCallMode,
): AsyncGenerator<RunEventPayload, ModelAttemptOutcome, void> {
  const state: ModelAttemptState = {
    bufferedToolSnapshots: [],
    emittedVisibleContent: false,
  };
  const iterator: AsyncIterator<RunEventPayload, ModelCallResult> = generator;
  let completed = false;
  try {
    const result = yield* forwardAttempt(iterator, state, mode === 'normal');
    completed = true;
    return { type: 'completed', result };
  } catch (error) {
    return { type: 'failed', error, state };
  } finally {
    if (!completed) await iterator.return?.();
  }
}

async function* forwardAttempt(
  iterator: AsyncIterator<RunEventPayload, ModelCallResult>,
  state: ModelAttemptState,
  exposeToolSnapshots: boolean,
): AsyncGenerator<RunEventPayload, ModelCallResult, void> {
  for (;;) {
    const next = await iterator.next();
    if (next.done) {
      if (exposeToolSnapshots) yield* state.bufferedToolSnapshots;
      state.bufferedToolSnapshots.length = 0;
      return next.value;
    }
    yield* forwardAttemptEvent(next.value, state, exposeToolSnapshots);
  }
}

function* forwardAttemptEvent(
  event: RunEventPayload,
  state: ModelAttemptState,
  exposeToolSnapshots: boolean,
): Generator<RunEventPayload> {
  if (event.type === 'tool_call_snapshot') {
    if (!exposeToolSnapshots) return;
    if (!state.emittedVisibleContent) {
      state.bufferedToolSnapshots.push(event);
      return;
    }
  }
  if (!state.emittedVisibleContent) {
    state.emittedVisibleContent = true;
    yield* state.bufferedToolSnapshots;
    state.bufferedToolSnapshots.length = 0;
  }
  yield event;
}

function recordMalformedAttempt(
  error: unknown,
  previousAttempts: number,
  recordUsage: (usage: Usage) => void,
): number {
  if (!(error instanceof MalformedToolCallError)) return previousAttempts;
  if (error.usage) recordUsage(error.usage);
  return previousAttempts + 1;
}

function isAbortedMalformed(
  error: unknown,
  options: ModelCallRecoveryOptions,
): boolean {
  return error instanceof MalformedToolCallError && options.isAborted();
}

function canRetryMalformed(
  outcome: Extract<ModelAttemptOutcome, { type: 'failed' }>,
  malformedAttempts: number,
  totalAttempt: number,
): boolean {
  return (
    outcome.error instanceof MalformedToolCallError &&
    !outcome.state.emittedVisibleContent &&
    malformedAttempts < MAX_MALFORMED_ATTEMPTS &&
    totalAttempt < MAX_TOTAL_ATTEMPTS
  );
}

function canUseToolDisabledFallback(
  outcome: Extract<ModelAttemptOutcome, { type: 'failed' }>,
  totalAttempt: number,
): outcome is Extract<ModelAttemptOutcome, { type: 'failed' }> & {
  error: MalformedToolCallError;
} {
  return (
    outcome.error instanceof MalformedToolCallError &&
    !outcome.state.emittedVisibleContent &&
    totalAttempt < MAX_TOTAL_ATTEMPTS
  );
}

function shouldStopEmptyRecovery(
  emptyAttempts: number,
  totalAttempt: number,
): boolean {
  return (
    emptyAttempts >= MAX_EMPTY_ATTEMPTS || totalAttempt >= MAX_TOTAL_ATTEMPTS
  );
}
