import type { RunEventPayload } from '../contracts/event';
import type { Message, ToolUseContent } from '../contracts/message';
import type { ProviderRequest, Usage } from '../contracts/provider';
import {
  ProviderError,
  RepeatedToolFailureError,
  RunAbortedError,
} from '../contracts/errors';
import type { ModelCallResult } from './accumulator';
import { drainEmits } from './event-queue';
import {
  getToolUseContents,
  hasExternallyHandledToolCall,
} from './exit-conditions';
import { streamModelCall } from './model-call';
import type { RunState } from './run-state';
import { isAborted, isHookAborted, isSignalAborted } from './run-state';
import { executeToolCalls } from './tool-executor';
import { ToolFailureBreaker } from './tool-failure-breaker';

export interface LoopCompletion {
  status: 'completed' | 'aborted' | 'max_iterations';
}

/**
 * The agent loop: call the model, execute requested tools, append results,
 * repeat — until the model stops requesting tools, an externally handled tool is
 * called, the iteration cap is hit, or the run is aborted.
 */
export async function* executeLoop(
  state: RunState,
): AsyncGenerator<RunEventPayload, LoopCompletion> {
  const breaker = new ToolFailureBreaker();
  for (let iteration = 0; iteration < state.maxIterations; iteration++) {
    const completion = yield* runIteration(state, iteration, breaker);
    if (completion) {
      return completion;
    }
  }
  return { status: 'max_iterations' };
}

/** One iteration; returns a completion to stop, or null to keep looping. */
async function* runIteration(
  state: RunState,
  iteration: number,
  breaker: ToolFailureBreaker,
): AsyncGenerator<RunEventPayload, LoopCompletion | null> {
  await state.hookRunner.beforeModelCall({
    iteration,
    messages: state.messages,
    tools: state.tools,
  });
  yield* drainEmits(state);
  if (isAborted(state)) {
    return { status: 'aborted' };
  }
  applyPendingMutations(state);
  const result = yield* callModelWithEmptyRetry(state, iteration);
  assertProviderReturnedContent(result);
  state.messages.push(result.message);
  const toolCalls = getToolUseContents(result.message);
  yield* assistantEvents(result, toolCalls);
  yield* drainEmits(state);
  if (isHookAborted(state)) {
    return { status: 'aborted' };
  }
  if (toolCalls.length === 0) return { status: 'completed' };
  const exitAfterToolPhase = hasExternallyHandledToolCall(
    result.message,
    state.tools,
  );
  if (isSignalAborted(state)) return { status: 'aborted' };
  yield* runToolPhase(state, iteration, toolCalls, breaker);
  return completionAfterToolPhase(state, exitAfterToolPhase);
}

const MAX_EMPTY_RESPONSE_ATTEMPTS = 2;

async function* callModelWithEmptyRetry(
  state: RunState,
  iteration: number,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  for (let attempt = 1; ; attempt++) {
    const result = yield* callModel(state, iteration);
    addUsage(state, result.usage);
    if (result.message.content.length > 0) {
      await runAfterModelCall(state, iteration, result);
      return result;
    }
    await runAfterModelCall(state, iteration, result);
    if (isAborted(state)) throw new RunAbortedError();
    if (attempt >= MAX_EMPTY_RESPONSE_ATTEMPTS) return result;
    applyPendingMutations(state);
  }
}

function runAfterModelCall(
  state: RunState,
  iteration: number,
  result: ModelCallResult,
): Promise<void> {
  return state.hookRunner.afterModelCall({
    iteration,
    message: result.message,
    usage: result.usage,
    finishReason: result.finishReason,
  });
}

function callModel(
  state: RunState,
  iteration: number,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  return streamModelCall({
    model: state.model,
    request: assembleRequest(state),
    onInterrupted: (interruption) =>
      state.hookRunner.modelCallInterrupted({ iteration, ...interruption }),
  });
}

const completionAfterToolPhase = (
  state: RunState,
  exitAfterToolPhase: boolean,
): LoopCompletion | null => {
  if (isAborted(state)) return { status: 'aborted' };
  return exitAfterToolPhase ? { status: 'completed' } : null;
};

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
  const toolResultMessage: Message = {
    role: 'tool_result',
    content: results,
  };
  state.messages.push(toolResultMessage);
  yield { type: 'tool_result_message', message: toolResultMessage };
  if (fatalError) {
    throw fatalError;
  }
  // An aborted phase fills the remaining calls with one identical synthetic
  // result — that is a cancellation, not a repeated tool failure.
  if (isAborted(state)) {
    return;
  }
  const tripped = breaker.record(results);
  if (tripped) {
    throw new RepeatedToolFailureError(tripped);
  }
}

const applyPendingMutations = (state: RunState): void => {
  const applied = state.mutations.apply({
    messages: state.messages,
    tools: state.tools,
    instructions: state.instructions,
  });
  state.messages = applied.messages;
  state.tools = applied.tools;
  state.instructions = applied.instructions;
};

const assembleRequest = (state: RunState): ProviderRequest => {
  return {
    instructions: state.instructions,
    messages: state.messages,
    tools: state.tools.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    })),
    ...(state.toolChoice !== undefined && state.tools.length > 0
      ? { toolChoice: state.toolChoice }
      : {}),
    ...(state.signal ? { signal: state.signal } : {}),
  };
};

const addUsage = (state: RunState, usage: Usage): void => {
  state.usage.inputTokens += usage.inputTokens ?? 0;
  state.usage.outputTokens += usage.outputTokens ?? 0;
};

const assertProviderReturnedContent = (result: ModelCallResult): void => {
  if (result.message.content.length === 0) {
    throw new ProviderError('Model provider returned an empty response');
  }
};
