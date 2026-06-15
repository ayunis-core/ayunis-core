import type { RunContext } from '../context/run-context';
import type { CustomEventInput, RunEvent } from './event';
import type { ChildRunInput } from './run-input';

/** Minimal JSON Schema shape; tools declare their parameters with it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** The schema-only view of a tool — what gets sent to the model. */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: JsonSchema;
}

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

/**
 * A concrete, executable tool. Tools are pure signals: they never inject
 * instructions or tools — only hooks do.
 *
 * A tool without `execute` is display-only: the model calling it ends the
 * loop (the call is surfaced to the consumer instead of being executed).
 */
export interface Tool extends ToolSchema {
  execute?(
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): string | Promise<string>;
}
