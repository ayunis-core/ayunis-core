import type { RunEventPayload } from '../contracts/event';
import type { Message, ToolUseContent } from '../contracts/message';
import type { ProviderRequest, Usage } from '../contracts/provider';
import type { ModelCallResult } from './accumulator';
import { drainEmits } from './event-queue';
import { getToolUseContents, shouldExitLoop } from './exit-conditions';
import { streamModelCall } from './model-call';
import type { RunState } from './run-state';
import { isAborted } from './run-state';
import { executeToolCalls } from './tool-executor';

export interface LoopCompletion {
  status: 'completed' | 'aborted' | 'max_iterations';
}

/**
 * The agent loop: call the model, execute requested tools, append results,
 * repeat — until the model stops requesting tools, a display-only tool is
 * called, the iteration cap is hit, or the run is aborted.
 */
export async function* executeLoop(
  state: RunState,
): AsyncGenerator<RunEventPayload, LoopCompletion> {
  for (let iteration = 0; iteration < state.maxIterations; iteration++) {
    const completion = yield* runIteration(state, iteration);
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
  const result = yield* streamModelCall({
    model: state.model,
    request: assembleRequest(state),
  });
  state.messages.push(result.message);
  addUsage(state, result.usage);
  const toolCalls = getToolUseContents(result.message);
  yield* assistantEvents(result, toolCalls);
  await state.hookRunner.afterModelCall({
    iteration,
    message: result.message,
    usage: result.usage,
    finishReason: result.finishReason,
  });
  yield* drainEmits(state);
  if (isAborted(state)) {
    return { status: 'aborted' };
  }
  if (shouldExitLoop(result.message, state.tools)) {
    return { status: 'completed' };
  }
  yield* runToolPhase(state, iteration, toolCalls);
  return isAborted(state) ? { status: 'aborted' } : null;
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

async function* runToolPhase(
  state: RunState,
  iteration: number,
  toolCalls: readonly ToolUseContent[],
): AsyncGenerator<RunEventPayload> {
  const results = yield* executeToolCalls(state, iteration, toolCalls);
  const toolResultMessage: Message = {
    role: 'tool_result',
    content: results,
  };
  state.messages.push(toolResultMessage);
  yield { type: 'tool_result_message', message: toolResultMessage };
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
