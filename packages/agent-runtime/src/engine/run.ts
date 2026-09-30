import { RunContext } from '../context/run-context';
import {
  AgentRuntimeError,
  InvalidRunInputError,
  MaxIterationsError,
  RunAbortedError,
} from '../contracts/errors';
import type { RunEvent, RunEventPayload, RunStatus } from '../contracts/event';
import type { ModelCallOutcome } from '../contracts/hook';
import {
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS,
  type RunInput,
} from '../contracts/run-input';
import { EmitBuffer, drainEmits } from './event-queue';
import { HookRunner, type RunEndFailure } from './hook-runner';
import type { LoopCompletion } from './loop';
import { executeLoop } from './loop';
import { TerminalModelCallError } from './model-call-recovery';
import { PendingMutations } from './mutations';
import { cloneRunConfig } from './request-snapshot';
import { resolveRetryConfig } from './retry-policy';
import { consumerCloseIterable } from './run-driver';
import { AbortState, isAborted, type RunState } from './run-state';

type Stamper = (payload: RunEventPayload) => RunEvent;

interface RunOutcome {
  status: RunStatus;
  error?: AgentRuntimeError;
  terminalCall?: ModelCallOutcome;
}

export const run = (input: RunInput): AsyncIterable<RunEvent> => {
  validateRunInput(input);
  return consumerCloseIterable((consumerSignal) =>
    executeRun(input, consumerSignal),
  );
};

const validateRunInput = (input: RunInput): void => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for untyped callers
  if (!input.model) {
    throw new InvalidRunInputError('model is required');
  }
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new InvalidRunInputError('messages must be a non-empty array');
  }
  if (
    input.maxIterations !== undefined &&
    (!Number.isInteger(input.maxIterations) || input.maxIterations < 1)
  ) {
    throw new InvalidRunInputError('maxIterations must be a positive integer');
  }
  if (
    input.modelCallIdleTimeoutMs !== undefined &&
    (!Number.isFinite(input.modelCallIdleTimeoutMs) ||
      input.modelCallIdleTimeoutMs <= 0)
  ) {
    throw new InvalidRunInputError(
      'modelCallIdleTimeoutMs must be a positive number',
    );
  }
  resolveRetryConfig(input.retry);
};

async function* executeRun(
  input: RunInput,
  consumerSignal: AbortSignal,
): AsyncGenerator<RunEvent> {
  const context = input.context ?? RunContext.create();
  const state = createRunState(input, context, consumerSignal);
  const stamp = createStamper(context);
  let runEndFired = false;
  let runEndFailures: RunEndFailure[] = [];
  try {
    yield stamp({ type: 'run_start', maxIterations: state.maxIterations });
    const outcome = yield* runMain(state, stamp);
    const beforeRunEnd = [...drainEmits(state)];
    runEndFired = true;
    runEndFailures = await fireRunEnd(state, outcome);
    const afterRunEnd = [...drainEmits(state)];
    yield* stampPayloads(beforeRunEnd, stamp);
    if (outcome.error) yield stamp(errorPayload(outcome));
    yield* stampPayloads(afterRunEnd, stamp);
    yield* stampedFinalizationErrors(runEndFailures, outcome.status, stamp);
    yield stamp({
      type: 'run_end',
      status: outcome.status,
      usage: state.usage,
    });
  } finally {
    if (!runEndFired) await finalizeAbandonedRun(state);
    else await rejectCriticalConsumerClose(runEndFailures, consumerSignal);
  }
}

async function* runMain(
  state: RunState,
  stamp: Stamper,
): AsyncGenerator<RunEvent, RunOutcome> {
  try {
    await state.hookRunner.runStart({
      messages: state.messages,
      instructions: state.instructions,
      tools: state.tools,
    });
    yield* stampedEmits(state, stamp);
    if (isAborted(state)) return { status: 'aborted' };
    const completion = yield* stampedLoop(state, stamp);
    return completionOutcome(state, completion);
  } catch (error) {
    if (error instanceof RunAbortedError) return { status: 'aborted' };
    if (error instanceof TerminalModelCallError) {
      return {
        status: 'error',
        error: error.runtimeError,
        terminalCall: error.call,
      };
    }
    return { status: 'error', error: toRuntimeError(error) };
  }
}

const completionOutcome = (
  state: RunState,
  completion: LoopCompletion,
): RunOutcome => {
  if (completion.status === 'max_iterations') {
    return {
      status: 'max_iterations',
      error: new MaxIterationsError(state.maxIterations),
    };
  }
  return { status: completion.status };
};

async function* stampedLoop(
  state: RunState,
  stamp: Stamper,
): AsyncGenerator<RunEvent, LoopCompletion> {
  const generator = executeLoop(state);
  let completed = false;
  try {
    for (;;) {
      const next = await generator.next();
      if (next.done) {
        completed = true;
        return next.value;
      }
      yield stamp(next.value);
    }
  } finally {
    if (!completed) await generator.return({ status: 'aborted' });
  }
}

function* stampedEmits(state: RunState, stamp: Stamper): Generator<RunEvent> {
  yield* stampPayloads(drainEmits(state), stamp);
}

function* stampPayloads(
  payloads: Iterable<RunEventPayload>,
  stamp: Stamper,
): Generator<RunEvent> {
  for (const payload of payloads) yield stamp(payload);
}

function* stampedFinalizationErrors(
  failures: readonly RunEndFailure[],
  outcome: RunStatus,
  stamp: Stamper,
): Generator<RunEvent> {
  for (const failure of failures) {
    const details = failure.error.details;
    yield stamp({
      type: 'finalization_error',
      hookName:
        typeof details?.hookName === 'string' ? details.hookName : 'unknown',
      message: failure.error.message,
      critical: failure.critical,
      outcome,
    });
  }
}

const createRunState = (
  input: RunInput,
  context: RunContext,
  consumerSignal: AbortSignal,
): RunState => {
  const mutations = new PendingMutations();
  const emits = new EmitBuffer();
  const abortState = new AbortState();
  const hooks = input.hooks ?? [];
  const hookRunner = new HookRunner({
    hooks,
    context,
    mutations,
    emits,
    abortState,
  });
  const initial = cloneRunConfig({
    messages: input.messages,
    tools: input.tools ?? [],
    instructions: input.instructions,
  });
  const retry = resolveRetryConfig(input.retry);
  return {
    context,
    model: input.model,
    messages: initial.messages,
    tools: initial.tools,
    instructions: initial.instructions,
    toolChoice: input.toolChoice,
    signal: input.signal,
    consumerSignal,
    maxIterations: input.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    retry,
    modelCallIdleTimeoutMs:
      input.modelCallIdleTimeoutMs ?? DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS,
    usage: emptyUsage(),
    mutations,
    emits,
    abortState,
    hookRunner,
    runChild: createChildRunner(input, context, hooks, retry, consumerSignal),
  };
};

const emptyUsage = (): RunState['usage'] => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheWriteInputTokens: 0,
});

const createChildRunner =
  (
    parent: RunInput,
    context: RunContext,
    hooks: NonNullable<RunInput['hooks']>,
    retry: RunState['retry'],
    consumerSignal: AbortSignal,
  ): RunState['runChild'] =>
  (child) =>
    run({
      ...child,
      hooks:
        child.hooks ??
        hooks.filter((hook) => hook.inheritToChildRuns !== false),
      retry: resolveRetryConfig(child.retry, retry),
      modelCallIdleTimeoutMs:
        child.modelCallIdleTimeoutMs ??
        parent.modelCallIdleTimeoutMs ??
        DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS,
      signal: combineSignals(parent.signal, consumerSignal, child.signal),
      context: context.deriveChild(),
    });

const combineSignals = (
  ...sources: Array<AbortSignal | undefined>
): AbortSignal | undefined => {
  const signals = sources.filter(
    (signal): signal is AbortSignal => signal !== undefined,
  );
  if (signals.length === 0) return undefined;
  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
};

const createStamper =
  (context: RunContext): Stamper =>
  (payload) => ({
    ...payload,
    runId: context.runId,
    depth: context.depth,
    path: context.path,
    timestamp: new Date().toISOString(),
  });

const errorPayload = (outcome: RunOutcome): RunEventPayload => {
  const error = outcome.error;
  if (!error)
    throw new Error('Cannot create an error payload without an error');
  const call = outcome.terminalCall;
  return {
    type: 'error',
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(call
      ? {
          modelCall: {
            modelCallId: call.modelCallId,
            runId: call.runId,
            turn: call.turn,
            callSequence: call.callSequence,
            trigger: call.trigger,
            provider: call.model.name,
          },
        }
      : {}),
    ...(call?.type === 'provider_failure'
      ? { providerFailure: call.providerFailure }
      : {}),
  };
};

const fireRunEnd = (
  state: RunState,
  outcome: RunOutcome,
): Promise<RunEndFailure[]> =>
  state.hookRunner.runEnd({
    messages: state.messages,
    status: outcome.status,
    error: outcome.error,
  });

const finalizeAbandonedRun = async (state: RunState): Promise<void> => {
  const failures = await fireRunEnd(state, { status: 'aborted' });
  const critical = failures.find((failure) => failure.critical)?.error;
  if (critical) throw critical;
};

const rejectCriticalConsumerClose = (
  failures: readonly RunEndFailure[],
  consumerSignal: AbortSignal,
): Promise<void> => {
  if (!consumerSignal.aborted) return Promise.resolve();
  const critical = failures.find((failure) => failure.critical)?.error;
  return critical ? Promise.reject(critical) : Promise.resolve();
};

const toRuntimeError = (error: unknown): AgentRuntimeError => {
  if (error instanceof AgentRuntimeError) return error;
  return new AgentRuntimeError(
    'RUN_FAILED',
    error instanceof Error ? error.message : 'Run failed',
    { cause: error },
  );
};
