import type { RunEventPayload, ToolCallSummary } from '../contracts/event';
import type { ToolCallOutcome } from '../contracts/hook';
import { AgentRuntimeError } from '../contracts/errors';
import type { ToolResultContent, ToolUseContent } from '../contracts/message';
import type {
  Tool,
  ToolExecutionContext,
  ToolExecutionOutput,
} from '../contracts/tool';
import { drainEmits } from './event-queue';
import type { RunState } from './run-state';
import { isAborted } from './run-state';

export const MAX_TOOL_RESULT_LENGTH = 200_000;
const EXTERNAL_TOOL_RESULT = 'Tool execution is handled externally';

interface ToolOutcome {
  result: string;
  isError: boolean;
  fatalError?: AgentRuntimeError;
}

interface ToolPhaseOutcome {
  results: ToolResultContent[];
  fatalError?: AgentRuntimeError;
}

/**
 * Executes the tool calls of one iteration sequentially, firing
 * beforeToolCall/afterToolCall hooks around each and yielding tool_result
 * events. Tool failures become error-flagged results — never throws.
 *
 * Once the run is aborted (via signal or a hook, including beforeToolCall
 * itself), remaining calls are not executed; they get synthetic aborted
 * results instead, so the tool_result message always pairs every tool_use
 * block and the transcript stays well-formed.
 */
export async function* executeToolCalls(
  state: RunState,
  iteration: number,
  calls: readonly ToolUseContent[],
): AsyncGenerator<RunEventPayload, ToolPhaseOutcome> {
  const results: ToolResultContent[] = [];
  let fatalError: AgentRuntimeError | undefined;
  for (const [callIndex, call] of calls.entries()) {
    const requested: ToolCallSummary = {
      id: call.id,
      name: call.name,
      input: call.input,
    };
    const { toolCall, outcome, hookOutcome } = yield* resolveToolCall(
      state,
      iteration,
      requested,
      fatalError !== undefined,
    );
    fatalError ??= outcome.fatalError;
    const result = await finalizeToolCall({
      state,
      iteration,
      toolCall,
      outcome,
      hookOutcome,
      isLastToolCall: callIndex === calls.length - 1,
    });
    yield* drainEmits(state);
    results.push(result);
    yield result;
  }
  return { results, ...(fatalError ? { fatalError } : {}) };
}

interface ResolvedToolCall {
  toolCall: ToolCallSummary;
  outcome: ToolOutcome;
  hookOutcome: ToolCallOutcome;
}

async function* resolveToolCall(
  state: RunState,
  iteration: number,
  requested: ToolCallSummary,
  skip: boolean,
): AsyncGenerator<RunEventPayload, ResolvedToolCall> {
  if (skip || isAborted(state)) {
    return {
      toolCall: requested,
      outcome: abortedOutcome(),
      hookOutcome: 'aborted',
    };
  }
  const toolCall = await state.hookRunner.beforeToolCall({
    iteration,
    toolCall: requested,
    findTool: (name) => findTool(state, name),
  });
  yield* drainEmits(state);
  if (isAborted(state)) {
    return { toolCall, outcome: abortedOutcome(), hookOutcome: 'aborted' };
  }
  const outcome = await runTool(
    state,
    findTool(state, toolCall.name),
    toolCall,
  );
  return {
    toolCall,
    outcome,
    hookOutcome: outcome.isError ? 'error' : 'success',
  };
}

interface FinalizeToolCallParams {
  state: RunState;
  iteration: number;
  toolCall: ToolCallSummary;
  outcome: ToolOutcome;
  hookOutcome: ToolCallOutcome;
  isLastToolCall: boolean;
}

async function finalizeToolCall(
  params: FinalizeToolCallParams,
): Promise<Extract<RunEventPayload, { type: 'tool_result' }>> {
  await params.state.hookRunner.afterToolCall({
    iteration: params.iteration,
    toolCall: params.toolCall,
    result: params.outcome.result,
    isError: params.outcome.isError,
    outcome: params.hookOutcome,
    isLastToolCall: params.isLastToolCall,
  });
  return buildToolResult(params.toolCall, params.outcome);
}

const buildToolResult = (
  toolCall: ToolCallSummary,
  outcome: ToolOutcome,
): Extract<RunEventPayload, { type: 'tool_result' }> => ({
  type: 'tool_result',
  toolCallId: toolCall.id,
  toolName: toolCall.name,
  result: outcome.result,
  isError: outcome.isError,
});

const abortedOutcome = (): ToolOutcome => ({
  result: 'The run was aborted before this tool call was executed.',
  isError: true,
});

const findTool = (state: RunState, name: string): Tool | undefined => {
  return state.tools.find((tool) => tool.name === name);
};

const runTool = async (
  state: RunState,
  tool: Tool | undefined,
  call: ToolCallSummary,
): Promise<ToolOutcome> => {
  if (!tool) {
    return {
      result: `A tool with the name ${call.name} was not found. It might have been removed or renamed.`,
      isError: true,
    };
  }
  const validationError = validateToolInput(tool, call.input);
  if (validationError !== null) {
    return { result: validationError, isError: true };
  }
  if (!tool.execute) {
    return {
      result: EXTERNAL_TOOL_RESULT,
      isError: false,
    };
  }
  try {
    const value = await tool.execute(
      call.input,
      buildToolContext(state, call.id),
    );
    return normalizeToolOutput(value);
  } catch (error) {
    return failedOutcome(error);
  }
};

// For externally handled tools this is the final host-side validation seam;
// for executable tools it is a guard that skips execute entirely.
const validateToolInput = (
  tool: Tool,
  input: Record<string, unknown>,
): string | null => {
  try {
    tool.validateInput?.(input);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid tool input';
  }
};

const normalizeToolOutput = (output: ToolExecutionOutput): ToolOutcome => {
  if (typeof output === 'string') {
    return { result: clampResult(output), isError: false };
  }
  return { result: clampResult(output.result), isError: output.isError };
};

const failedOutcome = (error: unknown): ToolOutcome => {
  if (error instanceof AgentRuntimeError) {
    return { result: error.message, isError: true, fatalError: error };
  }
  const message =
    error instanceof Error ? error.message : 'Tool execution failed';
  return { result: message, isError: true };
};

const buildToolContext = (
  state: RunState,
  toolCallId: string,
): ToolExecutionContext => {
  return {
    context: state.context,
    toolCallId,
    signal: state.signal,
    emit: (event) => state.emits.push(event),
    runChild: state.runChild,
  };
};

const clampResult = (result: string): string => {
  if (result.length <= MAX_TOOL_RESULT_LENGTH) {
    return result;
  }
  return `${result.slice(0, MAX_TOOL_RESULT_LENGTH)}\n[result truncated]`;
};
