import {
  AgentRuntimeError,
  RepeatedToolFailureError,
  RunAbortedError,
} from '../contracts/errors';
import type { RunEventPayload } from '../contracts/event';
import type {
  ModelCallIdentity,
  ModelCallOutcome,
  ModelCallTrigger,
  ModelTurnOutcome,
} from '../contracts/hook';
import type { Message, ToolUseContent } from '../contracts/message';
import type { Usage } from '../contracts/provider';
import type { ModelCallResult } from './accumulator';
import { drainEmits } from './event-queue';
import {
  getToolUseContents,
  hasExternallyHandledToolCall,
} from './exit-conditions';
import type { TerminalHookFailure } from './hook-runner';
import { streamModelCall } from './model-call';
import { ModelCallScope } from './model-call-scope';
import {
  callModelWithRecovery,
  TerminalModelCallError,
} from './model-call-recovery';
import {
  cloneRunConfig,
  requestSnapshot,
  type ModelCallMode,
} from './request-snapshot';
import { providerRetryDelay } from './retry-policy';
import type { RunState } from './run-state';
import { isAborted, isHookAborted, isSignalAborted } from './run-state';
import { executeToolCalls } from './tool-executor';
import { ToolFailureBreaker } from './tool-failure-breaker';

export interface LoopCompletion {
  status: 'completed' | 'aborted' | 'max_iterations';
}

interface TurnRecord {
  lastCall?: ModelCallOutcome;
  terminalCall?: ModelCallOutcome;
}

export async function* executeLoop(
  state: RunState,
): AsyncGenerator<RunEventPayload, LoopCompletion> {
  const breaker = new ToolFailureBreaker();
  for (let iteration = 0; iteration < state.maxIterations; iteration++) {
    const completion = yield* runIteration(state, iteration, breaker);
    if (completion) return completion;
  }
  return { status: 'max_iterations' };
}

async function* runIteration(
  state: RunState,
  iteration: number,
  breaker: ToolFailureBreaker,
): AsyncGenerator<RunEventPayload, LoopCompletion | null> {
  const result = yield* runModelTurn(state, iteration);
  yield* drainEmits(state);
  const toolCalls = getToolUseContents(result.message);
  yield* assistantEvents(result, toolCalls);
  if (isHookAborted(state)) return { status: 'aborted' };
  if (toolCalls.length === 0) return { status: 'completed' };
  const exitAfterTools = hasExternallyHandledToolCall(
    result.message,
    state.tools,
  );
  if (isSignalAborted(state)) return { status: 'aborted' };
  yield* runToolPhase(state, iteration, toolCalls, breaker);
  if (isAborted(state)) return { status: 'aborted' };
  return exitAfterTools ? { status: 'completed' } : null;
}

async function* runModelTurn(
  state: RunState,
  iteration: number,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  const turn = iteration + 1;
  const record: TurnRecord = {};
  const finalizer = new ModelTurnFinalizer(state, iteration, turn, record);
  try {
    applyPendingMutations(state);
    await runBeforeModelTurn(state, iteration, turn);
    yield* drainEmits(state);
    if (isAborted(state)) throw new RunAbortedError();
    applyPendingMutations(state);
    const call = yield* callModelRecovering(state, iteration, turn, record);
    if (isAborted(state)) throw new RunAbortedError();
    state.messages.push(call.message);
    await finalizer.complete({ type: 'accepted', call });
    if (isAborted(state)) throw new RunAbortedError();
    return toModelCallResult(call);
  } catch (error) {
    await finalizer.fail(error);
    throw finalizer.decorate(error);
  } finally {
    await finalizer.abandon();
  }
}

class ModelTurnFinalizer {
  private finalized = false;

  constructor(
    private readonly state: RunState,
    private readonly iteration: number,
    private readonly turn: number,
    private readonly record: TurnRecord,
  ) {}

  async complete(outcome: ModelTurnOutcome): Promise<void> {
    if (this.finalized) return;
    this.finalized = true;
    const critical = await finalizeTurn(
      this.state,
      this.iteration,
      this.turn,
      outcome,
    );
    if (!critical) return;
    const call = turnCall(outcome);
    if (call) throw new TerminalModelCallError(critical, call);
    throw critical;
  }

  async fail(error: unknown): Promise<void> {
    if (this.finalized) return;
    await this.complete(
      classifyTurnFailure(
        error,
        this.record,
        this.state.consumerSignal.aborted,
      ),
    );
  }

  async abandon(): Promise<void> {
    if (this.finalized) return;
    await this.complete({
      type: 'consumer_abandoned',
      ...(this.record.lastCall ? { call: this.record.lastCall } : {}),
    });
  }

  decorate(error: unknown): unknown {
    if (error instanceof TerminalModelCallError) return error;
    if (error instanceof AgentRuntimeError && this.record.terminalCall) {
      return new TerminalModelCallError(error, this.record.terminalCall);
    }
    return error;
  }
}

const runBeforeModelTurn = (
  state: RunState,
  iteration: number,
  turn: number,
): Promise<void> =>
  state.hookRunner.beforeModelTurn({
    iteration,
    turn,
    model: state.model,
    messages: state.messages,
    instructions: state.instructions,
    tools: state.tools,
  });

const turnCall = (outcome: ModelTurnOutcome): ModelCallOutcome | undefined =>
  'call' in outcome ? outcome.call : undefined;

function callModelRecovering(
  state: RunState,
  iteration: number,
  turn: number,
  record: TurnRecord,
): AsyncGenerator<RunEventPayload, ModelCallOutcome> {
  let callSequence = 0;
  return callModelWithRecovery({
    maxRetries: state.retry.maxRetries,
    call: (trigger, mode) => {
      callSequence += 1;
      return callModel({
        state,
        iteration,
        turn,
        callSequence,
        trigger,
        mode,
        turnRecord: record,
      });
    },
    providerRetryDelay: (outcome, retryNumber) =>
      retryDelayForOutcome(state, outcome, retryNumber),
    waitForProviderRetry: (delayMs) => waitForRetry(state, delayMs),
    isAborted: () => isAborted(state),
    isHookAborted: () => isHookAborted(state),
  });
}

interface CallModelParams {
  state: RunState;
  iteration: number;
  turn: number;
  callSequence: number;
  trigger: ModelCallTrigger;
  mode: ModelCallMode;
  turnRecord: TurnRecord;
}

async function* callModel(
  params: CallModelParams,
): AsyncGenerator<RunEventPayload, ModelCallOutcome> {
  const prepared = await prepareModelCall(params);
  yield* drainEmits(params.state);
  if (isAborted(params.state)) {
    prepared.scope.dispose();
    throw new RunAbortedError();
  }
  const outcome = yield* streamModelCall({
    ...prepared,
    mode: params.mode,
    record: {},
    onFinished: (finished) =>
      finishCall(params.state, params.iteration, params.turnRecord, finished),
  });
  yield* drainEmits(params.state);
  return outcome;
}

const prepareModelCall = async (
  params: CallModelParams,
): Promise<{
  identity: ModelCallIdentity;
  model: RunState['model'];
  request: ReturnType<typeof requestSnapshot>;
  scope: ModelCallScope;
}> => {
  const identity = callIdentity(params);
  const scope = new ModelCallScope(
    params.state.signal,
    params.state.abortState.signal,
    params.state.consumerSignal,
    params.state.modelCallIdleTimeoutMs,
  );
  try {
    const config = await params.state.hookRunner.beforeModelCall({
      iteration: params.iteration,
      identity,
      config: cloneRunConfig(params.state),
      mode: params.mode,
      toolChoice: params.state.toolChoice,
      signal: scope.signal,
    });
    const request = requestSnapshot({
      config,
      mode: params.mode,
      toolChoice: params.state.toolChoice,
      signal: scope.signal,
      sanitize: true,
    });
    return { identity, model: params.state.model, request, scope };
  } catch (error) {
    scope.dispose();
    throw error;
  }
};

const callIdentity = (params: CallModelParams): ModelCallIdentity => ({
  modelCallId: crypto.randomUUID(),
  runId: params.state.context.runId,
  turn: params.turn,
  callSequence: params.callSequence,
  trigger: params.trigger,
  model: params.state.model,
});

async function finishCall(
  state: RunState,
  iteration: number,
  record: TurnRecord,
  outcome: ModelCallOutcome,
): Promise<void> {
  record.lastCall = outcome;
  addUsage(state, outcome.usage);
  const failures = await state.hookRunner.afterModelCall(iteration, outcome);
  const critical = firstCritical(failures);
  if (critical) {
    record.terminalCall = outcome;
    throw critical;
  }
}

const retryDelayForOutcome = (
  state: RunState,
  outcome: ModelCallOutcome,
  retryNumber: number,
): number | undefined => {
  if (outcome.type !== 'provider_failure') return undefined;
  return providerRetryDelay(state.retry, outcome.providerFailure, retryNumber);
};

async function finalizeTurn(
  state: RunState,
  iteration: number,
  turn: number,
  outcome: ModelTurnOutcome,
): Promise<AgentRuntimeError | undefined> {
  const failures = await state.hookRunner.afterModelTurn({
    iteration,
    turn,
    model: state.model,
    outcome,
    messages: state.messages,
  });
  return firstCritical(failures);
}

const classifyTurnFailure = (
  error: unknown,
  record: TurnRecord,
  consumerAbandoned: boolean,
): ModelTurnOutcome => {
  if (consumerAbandoned) {
    return {
      type: 'consumer_abandoned',
      ...(record.lastCall ? { call: record.lastCall } : {}),
    };
  }
  if (error instanceof TerminalModelCallError) {
    return { type: 'error', error: error.runtimeError, call: error.call };
  }
  if (record.lastCall?.type === 'consumer_abandoned') {
    return { type: 'consumer_abandoned', call: record.lastCall };
  }
  if (error instanceof RunAbortedError) {
    return {
      type: 'aborted',
      ...(record.lastCall ? { call: record.lastCall } : {}),
    };
  }
  return {
    type: 'error',
    error: toRuntimeError(error),
    ...(record.terminalCall ? { call: record.terminalCall } : {}),
  };
};

const toRuntimeError = (error: unknown): AgentRuntimeError => {
  if (error instanceof AgentRuntimeError) return error;
  const message = error instanceof Error ? error.message : 'Run failed';
  return new AgentRuntimeError('RUN_FAILED', message, { cause: error });
};

const firstCritical = (
  failures: readonly TerminalHookFailure[],
): AgentRuntimeError | undefined =>
  failures.find((failure) => failure.critical)?.error;

const waitForRetry = async (
  state: RunState,
  delayMs: number,
): Promise<void> => {
  if (isAborted(state)) throw new RunAbortedError();
  const signals = [
    state.signal,
    state.abortState.signal,
    state.consumerSignal,
  ].filter((signal): signal is AbortSignal => signal !== undefined);
  const signal = AbortSignal.any(signals);
  await abortableDelay(delayMs, signal);
};

const abortableDelay = (delayMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new RunAbortedError());
      return;
    }
    const finish = (): void => {
      signal.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    const abort = (): void => {
      clearTimeout(timer);
      reject(new RunAbortedError());
    };
    signal.addEventListener('abort', abort, { once: true });
  });

async function* runToolPhase(
  state: RunState,
  iteration: number,
  toolCalls: readonly ToolUseContent[],
  breaker: ToolFailureBreaker,
): AsyncGenerator<RunEventPayload> {
  const { results, fatalError } = yield* executeToolCalls(
    state,
    iteration,
    toolCalls,
  );
  const message: Message = { role: 'tool_result', content: results };
  state.messages.push(message);
  yield { type: 'tool_result_message', message };
  if (fatalError) throw fatalError;
  if (isAborted(state)) return;
  const tripped = breaker.record(results);
  if (tripped) throw new RepeatedToolFailureError(tripped);
}

function* assistantEvents(
  result: ModelCallResult,
  toolCalls: readonly ToolUseContent[],
): Generator<RunEventPayload> {
  for (const call of toolCalls) {
    yield {
      type: 'tool_call',
      toolCall: { id: call.id, name: call.name, input: call.input },
    };
  }
  yield {
    type: 'assistant_message',
    message: result.message,
    usage: result.usage,
  };
}

const applyPendingMutations = (state: RunState): void => {
  const applied = state.mutations.apply(state);
  state.messages = applied.messages;
  state.tools = applied.tools;
  state.instructions = applied.instructions;
};

const addUsage = (state: RunState, usage: Usage): void => {
  state.usage.inputTokens += usage.inputTokens ?? 0;
  state.usage.outputTokens += usage.outputTokens ?? 0;
  state.usage.cacheReadInputTokens += usage.cacheReadInputTokens ?? 0;
  state.usage.cacheWriteInputTokens += usage.cacheWriteInputTokens ?? 0;
};

const toModelCallResult = (outcome: ModelCallOutcome): ModelCallResult => ({
  message: outcome.message,
  usage: outcome.usage,
  finishReason: outcome.finishReason,
  invalidToolCallSnapshots: [],
});
