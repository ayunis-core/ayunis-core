import { MalformedToolCallError, RunAbortedError } from '../contracts/errors';
import type { RunEventPayload } from '../contracts/event';
import type { Usage } from '../contracts/provider';
import type { ModelCallResult } from './accumulator';

const MAX_MALFORMED_ATTEMPTS = 3;
const MAX_EMPTY_ATTEMPTS = 2;
const MAX_TOTAL_ATTEMPTS = MAX_MALFORMED_ATTEMPTS + MAX_EMPTY_ATTEMPTS - 1;

export interface ModelCallRecoveryOptions {
  call: () => AsyncGenerator<RunEventPayload, ModelCallResult>;
  afterCompleted: (result: ModelCallResult) => Promise<void>;
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
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  let emptyAttempts = 0;
  let malformedAttempts = 0;

  for (
    let totalAttempt = 1;
    totalAttempt <= MAX_TOTAL_ATTEMPTS;
    totalAttempt++
  ) {
    const outcome = yield* runAttempt(options.call());
    if (outcome.type === 'failed') {
      malformedAttempts = recordMalformedAttempt(
        outcome.error,
        malformedAttempts,
        options.recordUsage,
      );
      if (isAbortedMalformed(outcome.error, options)) {
        throw new RunAbortedError();
      }
      if (canRetryMalformed(outcome, malformedAttempts, totalAttempt)) {
        continue;
      }
      yield* outcome.state.bufferedToolSnapshots;
      throw outcome.error;
    }

    const { result } = outcome;
    options.recordUsage(result.usage);
    await options.afterCompleted(result);
    if (result.message.content.length > 0) return result;

    emptyAttempts++;
    if (options.isAborted()) throw new RunAbortedError();
    if (shouldStopEmptyRecovery(emptyAttempts, totalAttempt)) return result;
    options.applyPendingMutations();
  }

  throw new Error('Model-call recovery exhausted without an outcome');
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

async function* runAttempt(
  generator: AsyncGenerator<RunEventPayload, ModelCallResult>,
): AsyncGenerator<RunEventPayload, ModelAttemptOutcome> {
  const state: ModelAttemptState = {
    bufferedToolSnapshots: [],
    emittedVisibleContent: false,
  };
  const iterator: AsyncIterator<RunEventPayload, ModelCallResult> = generator;
  let completed = false;
  try {
    const result = yield* forwardAttempt(iterator, state);
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
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  for (;;) {
    const next = await iterator.next();
    if (next.done) {
      yield* state.bufferedToolSnapshots;
      state.bufferedToolSnapshots.length = 0;
      return next.value;
    }
    yield* forwardAttemptEvent(next.value, state);
  }
}

function* forwardAttemptEvent(
  event: RunEventPayload,
  state: ModelAttemptState,
): Generator<RunEventPayload> {
  if (event.type === 'tool_call_snapshot' && !state.emittedVisibleContent) {
    state.bufferedToolSnapshots.push(event);
    return;
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

function shouldStopEmptyRecovery(
  emptyAttempts: number,
  totalAttempt: number,
): boolean {
  return (
    emptyAttempts >= MAX_EMPTY_ATTEMPTS || totalAttempt >= MAX_TOTAL_ATTEMPTS
  );
}
