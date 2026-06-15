import type { RunContext } from '../context/run-context';
import type { AgentRuntimeError } from './errors';
import type { CustomEventInput, RunStatus, ToolCallSummary } from './event';
import type { AssistantMessage, Message } from './message';
import type { FinishReason, Usage } from './provider';
import type { Tool } from './tool';

/**
 * The mutation API available to every hook phase. Tool/instruction/message
 * mutations are buffered and applied at the next provider-request assembly
 * (which happens after `beforeModelCall` fires): mutations made in
 * `runStart`/`beforeModelCall` affect the imminent model call; mutations
 * made in `afterModelCall`/`afterToolCall` affect the next iteration.
 * `abort` and `emit` take effect immediately.
 */
export interface HookApi {
  readonly context: RunContext;
  transformMessages(fn: (messages: readonly Message[]) => Message[]): void;
  addTools(...tools: Tool[]): void;
  removeTools(...names: string[]): void;
  /** Full-replace escape hatch (e.g. re-assembling the whole tool set). */
  setTools(tools: Tool[]): void;
  addInstructions(text: string): void;
  /** Ends the run with status 'aborted' before the next loop step. */
  abort(reason?: string): void;
  /** Emits a `custom` RunEvent into the run's event stream. */
  emit(event: CustomEventInput): void;
}

export interface RunStartContext extends HookApi {
  readonly messages: readonly Message[];
  readonly instructions: string;
  readonly tools: readonly Tool[];
}

export interface BeforeModelCallContext extends HookApi {
  readonly iteration: number;
  readonly messages: readonly Message[];
  readonly tools: readonly Tool[];
}

export interface AfterModelCallContext extends HookApi {
  readonly iteration: number;
  readonly message: AssistantMessage;
  readonly usage: Usage;
  readonly finishReason: FinishReason;
}

export interface BeforeToolCallContext extends HookApi {
  readonly iteration: number;
  readonly toolCall: ToolCallSummary;
  /** Undefined when the model called a tool that is not in the tool set. */
  readonly tool: Tool | undefined;
  /** Rewrites THIS tool call before execution (same-phase mutation). */
  rewriteToolCall(patch: {
    name?: string;
    input?: Record<string, unknown>;
  }): void;
}

export interface AfterToolCallContext extends HookApi {
  readonly iteration: number;
  readonly toolCall: ToolCallSummary;
  readonly result: string;
  readonly isError: boolean;
}

export interface RunEndContext extends HookApi {
  readonly messages: readonly Message[];
  readonly status: RunStatus;
  readonly error?: AgentRuntimeError;
}

/**
 * The single extension mechanism. Hooks fire in registration order and are
 * awaited sequentially. Hooks inherit downward to child (subagent) runs by
 * default.
 */
export interface Hook {
  readonly name: string;
  runStart?(ctx: RunStartContext): void | Promise<void>;
  beforeModelCall?(ctx: BeforeModelCallContext): void | Promise<void>;
  afterModelCall?(ctx: AfterModelCallContext): void | Promise<void>;
  beforeToolCall?(ctx: BeforeToolCallContext): void | Promise<void>;
  afterToolCall?(ctx: AfterToolCallContext): void | Promise<void>;
  runEnd?(ctx: RunEndContext): void | Promise<void>;
}
