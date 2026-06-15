import type { RunEventPayload, ToolCallSummary } from '../contracts/event';
import type { ToolResultContent, ToolUseContent } from '../contracts/message';
import type { Tool, ToolExecutionContext } from '../contracts/tool';
import { drainEmits } from './event-queue';
import type { RunState } from './run-state';
import { isAborted } from './run-state';

export const MAX_TOOL_RESULT_LENGTH = 20_000;

interface ToolOutcome {
  result: string;
  isError: boolean;
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
): AsyncGenerator<RunEventPayload, ToolResultContent[]> {
  const results: ToolResultContent[] = [];
  for (const call of calls) {
    const requested: ToolCallSummary = {
      id: call.id,
      name: call.name,
      input: call.input,
    };
    let toolCall = requested;
    let outcome: ToolOutcome;
    if (isAborted(state)) {
      outcome = abortedOutcome();
    } else {
      toolCall = await state.hookRunner.beforeToolCall({
        iteration,
        toolCall: requested,
        findTool: (name) => findTool(state, name),
      });
      yield* drainEmits(state);
      outcome = isAborted(state)
        ? abortedOutcome()
        : await runTool(state, findTool(state, toolCall.name), toolCall);
    }
    await state.hookRunner.afterToolCall({
      iteration,
      toolCall,
      result: outcome.result,
      isError: outcome.isError,
    });
    yield* drainEmits(state);
    results.push({
      type: 'tool_result',
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: outcome.result,
      isError: outcome.isError,
    });
    yield {
      type: 'tool_result',
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: outcome.result,
      isError: outcome.isError,
    };
  }
  return results;
}

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
  if (!tool.execute) {
    return {
      result: `The tool ${call.name} is display-only and cannot be executed.`,
      isError: true,
    };
  }
  try {
    const value = await tool.execute(
      call.input,
      buildToolContext(state, call.id),
    );
    return { result: clampResult(value), isError: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Tool execution failed';
    return { result: message, isError: true };
  }
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
