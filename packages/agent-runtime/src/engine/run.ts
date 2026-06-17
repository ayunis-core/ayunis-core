import { RunContext } from '../context/run-context';
import {
  AgentRuntimeError,
  InvalidRunInputError,
  MaxIterationsError,
  RunAbortedError,
} from '../contracts/errors';
import type { RunEvent, RunEventPayload, RunStatus } from '../contracts/event';
import { DEFAULT_MAX_ITERATIONS, type RunInput } from '../contracts/run-input';
import { EmitBuffer, drainEmits } from './event-queue';
import { HookRunner } from './hook-runner';
import type { LoopCompletion } from './loop';
import { executeLoop } from './loop';
import { PendingMutations } from './mutations';
import { AbortState, type RunState } from './run-state';

type Stamper = (payload: RunEventPayload) => RunEvent;

interface RunOutcome {
  status: RunStatus;
  error?: AgentRuntimeError;
}

/**
 * The runtime's single entry point. Validates input synchronously (the
 * only throwing path), then returns the run's event stream. All other
 * failures surface as `error` events + `run_end` with a status.
 */
export const run = (input: RunInput): AsyncIterable<RunEvent> => {
  validateRunInput(input);
  return executeRun(input);
};

const validateRunInput = (input: RunInput): void => {
  validateModel(input);
  validateMessages(input);
  validateMaxIterations(input);
};

const validateModel = (input: RunInput): void => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for untyped (plain JS) callers
  if (!input.model) {
    throw new InvalidRunInputError('model is required');
  }
};

const validateMessages = (input: RunInput): void => {
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new InvalidRunInputError('messages must be a non-empty array');
  }
};

const validateMaxIterations = (input: RunInput): void => {
  if (input.maxIterations === undefined) {
    return;
  }
  if (!Number.isInteger(input.maxIterations) || input.maxIterations < 1) {
    throw new InvalidRunInputError('maxIterations must be a positive integer');
  }
};

async function* executeRun(input: RunInput): AsyncGenerator<RunEvent> {
  const context = input.context ?? RunContext.create();
  const state = createRunState(input, context);
  const stamp = createStamper(context);
  let runEndFired = false;
  try {
    yield stamp({ type: 'run_start', maxIterations: state.maxIterations });
    const outcome = yield* runMain(state, stamp);
    if (outcome.error) {
      yield stamp(errorPayload(outcome.error));
    }
    runEndFired = true;
    await fireRunEnd(state, outcome);
    yield* stampedEmits(state, stamp);
    yield stamp({
      type: 'run_end',
      status: outcome.status,
      usage: state.usage,
    });
  } finally {
    if (!runEndFired) {
      // Consumer abandoned the stream (early return); still notify hooks.
      await fireRunEnd(state, { status: 'aborted' });
    }
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
    const completion = yield* stampedLoop(state, stamp);
    if (completion.status === 'max_iterations') {
      return {
        status: 'max_iterations',
        error: new MaxIterationsError(state.maxIterations),
      };
    }
    return { status: completion.status };
  } catch (error) {
    if (error instanceof RunAbortedError) {
      return { status: 'aborted' };
    }
    return { status: 'error', error: toRuntimeError(error) };
  }
}

async function* stampedLoop(
  state: RunState,
  stamp: Stamper,
): AsyncGenerator<RunEvent, LoopCompletion> {
  const generator = executeLoop(state);
  for (;;) {
    const next = await generator.next();
    if (next.done) {
      return next.value;
    }
    yield stamp(next.value);
  }
}

function* stampedEmits(state: RunState, stamp: Stamper): Generator<RunEvent> {
  for (const payload of drainEmits(state)) {
    yield stamp(payload);
  }
}

const createRunState = (input: RunInput, context: RunContext): RunState => {
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
  return {
    context,
    model: input.model,
    messages: [...input.messages],
    tools: [...(input.tools ?? [])],
    instructions: input.instructions,
    toolChoice: input.toolChoice,
    signal: input.signal,
    maxIterations: input.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    usage: { inputTokens: 0, outputTokens: 0 },
    mutations,
    emits,
    abortState,
    hookRunner,
    runChild: (child) =>
      run({
        ...child,
        hooks: child.hooks ?? hooks,
        context: context.deriveChild(),
      }),
  };
};

const createStamper = (context: RunContext): Stamper => {
  return (payload) => ({
    ...payload,
    runId: context.runId,
    depth: context.depth,
    path: context.path,
    timestamp: new Date().toISOString(),
  });
};

const errorPayload = (error: AgentRuntimeError): RunEventPayload => {
  return {
    type: 'error',
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  };
};

const fireRunEnd = async (
  state: RunState,
  outcome: RunOutcome,
): Promise<void> => {
  try {
    await state.hookRunner.runEnd({
      messages: state.messages,
      status: outcome.status,
      error: outcome.error,
    });
  } catch {
    // runEnd hook failures must not mask the run's outcome.
  }
};

const toRuntimeError = (error: unknown): AgentRuntimeError => {
  if (error instanceof AgentRuntimeError) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Run failed';
  return new AgentRuntimeError('RUN_FAILED', message, { cause: error });
};
