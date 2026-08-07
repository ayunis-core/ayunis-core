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
  readonly signal?: AbortSignal;
  /** Emits a `custom` RunEvent into the run's event stream. */
  emit(event: CustomEventInput): void;
  /**
   * Reserved subagent seam: re-enters the loop with a derived child
   * context; parent hooks are inherited unless overridden in the input.
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
 * A tool without `execute` is display-only: it receives a synthetic display
 * acknowledgement and ends the loop after the current tool phase.
 */
export interface Tool extends ToolSchema {
  execute?(
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): ToolExecutionOutput | Promise<ToolExecutionOutput>;
  /**
   * Optional input validation, always consulted when present: it runs before
   * `execute`, or before the display acknowledgement for display-only tools.
   * When it throws, the call yields an error result carrying the thrown
   * message instead of executing or acking, and the loop keeps running so
   * the model can retry with corrected input. Mostly useful for display-only
   * tools, which otherwise render whatever the model produced without any
   * check; tools with `execute` typically validate in their own handler.
   */
  validateInput?(input: Record<string, unknown>): void;
}
