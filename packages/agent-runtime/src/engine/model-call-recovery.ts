import {
  MalformedToolCallError,
  ProviderError,
  RunAbortedError,
} from '../contracts/errors';
import type { AgentRuntimeError } from '../contracts/errors';
import type { RunEventPayload } from '../contracts/event';
import type { ModelCallOutcome, ModelCallTrigger } from '../contracts/hook';
import type { ModelCallMode } from './request-snapshot';

export class TerminalModelCallError extends Error {
  constructor(
    readonly runtimeError: AgentRuntimeError,
    readonly call: ModelCallOutcome,
  ) {
    super(runtimeError.message, { cause: runtimeError });
  }
}

export interface ModelCallRecoveryOptions {
  maxRetries: number;
  call: (
    trigger: ModelCallTrigger,
    mode: ModelCallMode,
  ) => AsyncGenerator<RunEventPayload, ModelCallOutcome>;
  providerRetryDelay: (
    outcome: ModelCallOutcome,
    retryNumber: number,
  ) => number | undefined;
  waitForProviderRetry: (delayMs: number) => Promise<void>;
  isAborted: () => boolean;
  isHookAborted: () => boolean;
}

interface RecoveryState {
  readonly trigger: ModelCallTrigger;
  readonly mode: ModelCallMode;
  readonly retriesUsed: number;
  readonly malformedError?: MalformedToolCallError;
}

type RecoveryDecision =
  | { readonly type: 'accepted'; readonly outcome: ModelCallOutcome }
  | { readonly type: 'abort' }
  | { readonly type: 'terminal'; readonly error: TerminalModelCallError }
  | {
      readonly type: 'retry';
      readonly state: RecoveryState;
      readonly delayMs: number;
    };

export async function* callModelWithRecovery(
  options: ModelCallRecoveryOptions,
): AsyncGenerator<RunEventPayload, ModelCallOutcome> {
  let state: RecoveryState = {
    trigger: 'initial',
    mode: 'normal',
    retriesUsed: 0,
  };
  for (;;) {
    const outcome = yield* options.call(state.trigger, state.mode);
    const decision = decideRecovery(options, state, outcome);
    if (decision.type === 'accepted') return decision.outcome;
    if (decision.type === 'abort') throw new RunAbortedError();
    if (decision.type === 'terminal') throw decision.error;
    state = decision.state;
    if (decision.delayMs > 0) {
      await options.waitForProviderRetry(decision.delayMs);
    }
  }
}

const decideRecovery = (
  options: ModelCallRecoveryOptions,
  state: RecoveryState,
  outcome: ModelCallOutcome,
): RecoveryDecision => {
  if (options.isHookAborted()) return { type: 'abort' };
  if (outcome.type === 'accepted') return { type: 'accepted', outcome };
  if (isAbortedOutcome(outcome)) return { type: 'abort' };
  if (options.isAborted()) return { type: 'abort' };
  if (outcome.visibleOutput || state.retriesUsed >= options.maxRetries) {
    return terminalDecision(outcome, state.malformedError);
  }
  return retryDecision(options, state, outcome);
};

const isAbortedOutcome = (
  outcome: ModelCallOutcome,
): outcome is Extract<
  ModelCallOutcome,
  { type: 'aborted' | 'consumer_abandoned' }
> => outcome.type === 'aborted' || outcome.type === 'consumer_abandoned';

const retryDecision = (
  options: ModelCallRecoveryOptions,
  state: RecoveryState,
  outcome: Exclude<
    ModelCallOutcome,
    { type: 'accepted' | 'aborted' | 'consumer_abandoned' }
  >,
): RecoveryDecision => {
  const next = nextAttempt(
    outcome,
    state.mode,
    state.malformedError,
    options.maxRetries - state.retriesUsed,
  );
  if (!next.retry) return terminalDecision(outcome, next.malformedError);
  const delayMs = retryDelay(options, outcome, state.retriesUsed + 1);
  if (delayMs === undefined) {
    return terminalDecision(outcome, next.malformedError);
  }
  return {
    type: 'retry',
    delayMs,
    state: {
      trigger: next.trigger,
      mode: next.mode,
      retriesUsed: state.retriesUsed + 1,
      ...(next.malformedError ? { malformedError: next.malformedError } : {}),
    },
  };
};

const retryDelay = (
  options: ModelCallRecoveryOptions,
  outcome: ModelCallOutcome,
  retryNumber: number,
): number | undefined =>
  outcome.type === 'provider_failure'
    ? options.providerRetryDelay(outcome, retryNumber)
    : 0;

interface NextAttempt {
  readonly retry: boolean;
  readonly trigger: ModelCallTrigger;
  readonly mode: ModelCallMode;
  readonly malformedError?: MalformedToolCallError;
}

const nextAttempt = (
  outcome: Extract<ModelCallOutcome, { type: 'provider_failure' | 'rejected' }>,
  mode: ModelCallMode,
  previousMalformed: MalformedToolCallError | undefined,
  retriesRemaining: number,
): NextAttempt => {
  if (outcome.type === 'provider_failure') {
    return providerRetry(mode, previousMalformed, retriesRemaining);
  }
  return rejectedRetry(outcome, mode, previousMalformed, retriesRemaining);
};

const rejectedRetry = (
  outcome: Extract<ModelCallOutcome, { type: 'rejected' }>,
  mode: ModelCallMode,
  previousMalformed: MalformedToolCallError | undefined,
  retriesRemaining: number,
): NextAttempt => {
  switch (outcome.reason) {
    case 'empty':
      return mode === 'tool_disabled_fallback' && previousMalformed
        ? noRetry(mode, previousMalformed)
        : semanticRetry('empty_recovery', mode, previousMalformed);
    case 'invalid_fallback':
      return noRetry(mode, previousMalformed);
    case 'malformed':
      return malformedRetry(outcome, mode, previousMalformed, retriesRemaining);
  }
};

const malformedRetry = (
  outcome: Extract<ModelCallOutcome, { type: 'rejected' }>,
  mode: ModelCallMode,
  previousMalformed: MalformedToolCallError | undefined,
  retriesRemaining: number,
): NextAttempt => {
  const malformed =
    outcome.error instanceof MalformedToolCallError
      ? outcome.error
      : previousMalformed;
  if (!malformed) return noRetry(mode, previousMalformed);
  if (mode === 'tool_disabled_fallback') return noRetry(mode, malformed);
  return retriesRemaining === 1
    ? semanticRetry('fallback', 'tool_disabled_fallback', malformed)
    : semanticRetry('malformed_recovery', 'normal', malformed);
};

const providerRetry = (
  mode: ModelCallMode,
  malformedError: MalformedToolCallError | undefined,
  retriesRemaining: number,
): NextAttempt =>
  retriesRemaining < 1
    ? noRetry(mode, malformedError)
    : {
        retry: true,
        trigger: 'provider_retry',
        mode,
        malformedError,
      };

const semanticRetry = (
  trigger: ModelCallTrigger,
  mode: ModelCallMode,
  malformedError: MalformedToolCallError | undefined,
): NextAttempt => ({ retry: true, trigger, mode, malformedError });

const noRetry = (
  mode: ModelCallMode,
  malformedError: MalformedToolCallError | undefined,
): NextAttempt => ({
  retry: false,
  trigger: 'initial',
  mode,
  malformedError,
});

const terminalDecision = (
  outcome: Exclude<ModelCallOutcome, { type: 'accepted' }>,
  malformedError: MalformedToolCallError | undefined,
): RecoveryDecision => ({
  type: 'terminal',
  error: terminalError(outcome, malformedError),
});

const terminalError = (
  outcome: Exclude<ModelCallOutcome, { type: 'accepted' }>,
  malformedError: MalformedToolCallError | undefined,
): TerminalModelCallError => {
  if (outcome.type === 'provider_failure') {
    return new TerminalModelCallError(outcome.error, outcome);
  }
  if (outcome.type === 'rejected') {
    const error = rejectedError(outcome, malformedError);
    return new TerminalModelCallError(error, outcome);
  }
  return new TerminalModelCallError(
    new ProviderError('Model call did not complete'),
    outcome,
  );
};

const rejectedError = (
  outcome: Extract<ModelCallOutcome, { type: 'rejected' }>,
  malformedError: MalformedToolCallError | undefined,
): AgentRuntimeError => {
  if (malformedError) return malformedError;
  return outcome.error;
};
