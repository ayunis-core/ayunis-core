import type { RunEventPayload, ToolCallSummary } from '../contracts/event';
import type { ToolCallOutcome } from '../contracts/hook';
import { AgentRuntimeError } from '../contracts/errors';
import type { ToolResultContent, ToolUseContent } from '../contracts/message';
import type {
  Tool,
  ToolExecutionContext,
  ToolExecutionOutput,
} from '../contracts/tool';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { drainEmits, EmitBuffer } from './event-queue';
import type { RunState } from './run-state';
import { isAborted } from './run-state';

export const MAX_TOOL_RESULT_LENGTH = 200_000;
export const MAX_CONCURRENT_TOOL_CALLS = 8;
const EXTERNAL_TOOL_RESULT = 'Tool execution is handled externally';

interface ToolOutcome {
  result: string;
  isError: boolean;
  aborted?: true;
  fatalError?: AgentRuntimeError;
}

interface ToolPhaseOutcome {
  results: ToolResultContent[];
  fatalError?: AgentRuntimeError;
}

interface ScheduledToolCall {
  toolCall: ToolCallSummary;
  outcome: Promise<ToolOutcome>;
  /** Tool emits, held back so they surface next to their own result. */
  emits: EmitBuffer;
}

/** Shared state of one iteration's tool calls while they execute. */
class ToolPhase {
  readonly limiter = new ConcurrencyLimiter(MAX_CONCURRENT_TOOL_CALLS);
  readonly scheduled: ScheduledToolCall[] = [];
  private readonly controller = new AbortController();
  private fatalError?: AgentRuntimeError;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  shouldSkip(state: RunState): boolean {
    return this.fatalError !== undefined || isAborted(state);
  }

  recordFatalError(error: AgentRuntimeError): void {
    this.fatalError ??= error;
    this.cancel();
  }

  cancel(): void {
    this.controller.abort(new Error('Tool phase cancelled'));
  }

  async settle(): Promise<void> {
    await Promise.allSettled(this.scheduled.map(({ outcome }) => outcome));
  }
}

/**
 * Executes the tool calls of one iteration. beforeToolCall hooks run in call
 * order, and each call starts executing as soon as its hooks have run, with
 * at most MAX_CONCURRENT_TOOL_CALLS in flight; an exclusive tool runs alone.
 * Tool emits, afterToolCall hooks and tool_result events then follow in call
 * order, so consumers and persistence see the same sequence as if the calls
 * had run one after another. Tool failures become error-flagged results —
 * never throws for them.
 *
 * Once the run is aborted (via signal or a hook, including beforeToolCall
 * itself) or a tool fails fatally, running calls are cancelled through their
 * signal and calls that have not started get synthetic aborted results, so
 * the tool_result message always pairs every tool_use block and the
 * transcript stays well-formed. The phase never ends with a tool still
 * running, so no tool outlives its run.
 */
export async function* executeToolCalls(
  state: RunState,
  iteration: number,
  calls: readonly ToolUseContent[],
): AsyncGenerator<RunEventPayload, ToolPhaseOutcome> {
  const phase = new ToolPhase();
  let completed = false;
  try {
    for (const call of calls) {
      yield* scheduleToolCall(state, iteration, call, phase);
    }
    const outcome = yield* finalizeToolCalls(state, iteration, phase);
    completed = true;
    return outcome;
  } finally {
    if (!completed) phase.cancel();
    await phase.settle();
  }
}

async function* scheduleToolCall(
  state: RunState,
  iteration: number,
  call: ToolUseContent,
  phase: ToolPhase,
): AsyncGenerator<RunEventPayload> {
  const requested: ToolCallSummary = {
    id: call.id,
    name: call.name,
    input: call.input,
  };
  const emits = new EmitBuffer();
  if (phase.shouldSkip(state)) {
    const outcome = Promise.resolve(abortedOutcome());
    phase.scheduled.push({ toolCall: requested, outcome, emits });
    return;
  }
  const toolCall = await state.hookRunner.beforeToolCall({
    iteration,
    toolCall: requested,
    findTool: (name) => findTool(state, name),
  });
  yield* drainEmits(state);
  const tool = findTool(state, toolCall.name);
  if (tool?.exclusive) await phase.settle();
  const outcome = phase.limiter.run(() =>
    startToolCall(state, phase, tool, toolCall, emits),
  );
  phase.scheduled.push({ toolCall, outcome, emits });
  if (tool?.exclusive) await outcome;
}

const startToolCall = async (
  state: RunState,
  phase: ToolPhase,
  tool: Tool | undefined,
  toolCall: ToolCallSummary,
  emits: EmitBuffer,
): Promise<ToolOutcome> => {
  if (phase.shouldSkip(state)) return abortedOutcome();
  const outcome = await runTool(state, phase, tool, toolCall, emits);
  if (outcome.fatalError) phase.recordFatalError(outcome.fatalError);
  return outcome;
};

async function* finalizeToolCalls(
  state: RunState,
  iteration: number,
  phase: ToolPhase,
): AsyncGenerator<RunEventPayload, ToolPhaseOutcome> {
  const results: ToolResultContent[] = [];
  let fatalError: AgentRuntimeError | undefined;
  const lastIndex = phase.scheduled.length - 1;
  for (const [callIndex, scheduled] of phase.scheduled.entries()) {
    const outcome = await scheduled.outcome;
    fatalError ??= outcome.fatalError;
    for (const event of scheduled.emits.drain()) state.emits.push(event);
    const result = await finalizeToolCall({
      state,
      iteration,
      toolCall: scheduled.toolCall,
      outcome,
      hookOutcome: toolCallOutcome(outcome),
      isLastToolCall: callIndex === lastIndex,
    });
    yield* drainEmits(state);
    results.push(result);
    yield result;
  }
  return { results, ...(fatalError ? { fatalError } : {}) };
}

const toolCallOutcome = (outcome: ToolOutcome): ToolCallOutcome => {
  if (outcome.aborted) return 'aborted';
  return outcome.isError ? 'error' : 'success';
};

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
  aborted: true,
});

const findTool = (state: RunState, name: string): Tool | undefined => {
  return state.tools.find((tool) => tool.name === name);
};

const runTool = async (
  state: RunState,
  phase: ToolPhase,
  tool: Tool | undefined,
  call: ToolCallSummary,
  emits: EmitBuffer,
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
  const context = buildToolContext(state, phase, call.id, emits);
  try {
    const value = await tool.execute(call.input, context);
    return normalizeToolOutput(value);
  } catch (error) {
    return failedOutcome(error, context.signal);
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

const failedOutcome = (error: unknown, signal?: AbortSignal): ToolOutcome => {
  const message =
    error instanceof Error ? error.message : 'Tool execution failed';
  if (signalCausedFailure(error, signal)) {
    return { result: message, isError: true, aborted: true };
  }
  if (error instanceof AgentRuntimeError) {
    return { result: error.message, isError: true, fatalError: error };
  }
  return { result: message, isError: true };
};

const signalCausedFailure = (
  error: unknown,
  signal: AbortSignal | undefined,
): boolean =>
  Boolean(
    signal?.aborted &&
    (error === signal.reason ||
      (typeof error === 'object' &&
        error !== null &&
        (error as { name?: unknown }).name === 'AbortError')),
  );

const buildToolContext = (
  state: RunState,
  phase: ToolPhase,
  toolCallId: string,
  emits: EmitBuffer,
): ToolExecutionContext => {
  return {
    context: state.context,
    toolCallId,
    toolNames: state.tools.map(({ name }) => name),
    signal: toolSignal(state, phase),
    emit: (event) => emits.push(event),
    runChild: state.runChild,
  };
};

const toolSignal = (state: RunState, phase: ToolPhase): AbortSignal =>
  AbortSignal.any(
    [
      state.signal,
      state.consumerSignal,
      state.abortState.signal,
      phase.signal,
    ].filter((signal): signal is AbortSignal => signal !== undefined),
  );

const clampResult = (result: string): string => {
  if (result.length <= MAX_TOOL_RESULT_LENGTH) {
    return result;
  }
  return `${result.slice(0, MAX_TOOL_RESULT_LENGTH)}\n[result truncated]`;
};
