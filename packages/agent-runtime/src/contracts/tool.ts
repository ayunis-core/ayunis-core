import type { ToolSchema } from '@ayunis/inference';

import type { RunContext } from '../context/run-context';
import type { CustomEventInput, RunEvent } from './event';
import type { ChildRunInput } from './run-input';

// JsonSchema and ToolSchema (the schema-only view sent to the model) live in
// @ayunis/inference; re-exported here so the engine's `../contracts/tool`
// imports keep resolving. Tool/ToolExecutionContext below are runtime-only.
export type { JsonSchema, ToolSchema } from '@ayunis/inference';

export interface ToolExecutionContext {
  /** The run's context bag (host data: tenancy, identity, per-run state). */
  readonly context: RunContext;
  readonly toolCallId: string;
  /** Names in the effective tool set at the start of this execution. */
  readonly toolNames: readonly string[];
  readonly signal?: AbortSignal;
  /** Emits a `custom` RunEvent into the run's event stream. */
  emit(event: CustomEventInput): void;
  /**
   * Reserved subagent seam: re-enters the loop with a derived child context;
   * eligible parent hooks are inherited unless overridden in the input.
   */
  runChild(input: ChildRunInput): AsyncIterable<RunEvent>;
}

export interface ToolExecutionResult {
  result: string;
  isError: boolean;
}

export type ToolExecutionOutput = string | ToolExecutionResult;

/**
 * A concrete, executable tool. Tools are pure signals: they never inject
 * instructions or tools — only hooks do.
 *
 * A tool without `execute` is handled externally and ends the loop after the
 * current tool phase has been settled.
 */
export interface Tool extends ToolSchema {
  /**
   * Calls of one model turn run concurrently by default. An exclusive tool
   * runs alone: it starts once the calls before it have settled, and the
   * calls after it start once it has settled. Use it for tools whose side
   * effects sibling calls may observe or race with.
   */
  readonly exclusive?: boolean;
  /**
   * The runtime never runs a call to this tool. When every call of a model
   * turn passes input validation and one of them needs approval, the run
   * completes after that turn without a tool phase: no call of the turn runs,
   * no tool hooks fire and no results exist, so the host can ask for approval
   * and settle the calls in a later run. If a call fails validation instead,
   * the turn's tool phase runs as usual and this call gets an error result
   * asking the model to repeat it. Give such tools a `validateInput` so that
   * invalid input reaches the model rather than the approval request.
   */
  readonly needsApproval?: boolean;
  execute?(
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): ToolExecutionOutput | Promise<ToolExecutionOutput>;
  /**
   * Optional input validation, always consulted when present: it runs before
   * `execute` or before external handoff. When it throws, the call yields an
   * error result carrying the thrown message, and the loop keeps running so
   * the model can retry with corrected input. Tools with `execute` typically
   * validate in their own handler.
   */
  validateInput?(input: Record<string, unknown>): void;
}
