import type { RunContext } from '../context/run-context';
import type { RunEvent } from '../contracts/event';
import type { Message } from '../contracts/message';
import type { ModelProvider, ToolChoice } from '../contracts/provider';
import type { ChildRunInput, RunInput } from '../contracts/run-input';
import type { Tool } from '../contracts/tool';
import type { EmitBuffer } from './event-queue';
import type { HookRunner } from './hook-runner';
import type { PendingMutations } from './mutations';

/** Hook-driven abort flag; checked by the loop between steps. */
export class AbortState {
  aborted = false;
  reason?: string;

  abort(reason?: string): void {
    this.aborted = true;
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
}

export interface RunUsageTotals {
  inputTokens: number;
  outputTokens: number;
}

/**
 * All per-run state, bundled. There is no module-level state anywhere in
 * the engine — this object is what makes the loop re-entrant (subagent
 * runs are just another RunState).
 */
export interface RunState {
  readonly context: RunContext;
  readonly model: ModelProvider;
  messages: Message[];
  tools: Tool[];
  instructions: string;
  readonly toolChoice?: ToolChoice;
  readonly signal?: AbortSignal;
  readonly maxIterations: number;
  readonly usage: RunUsageTotals;
  readonly mutations: PendingMutations;
  readonly emits: EmitBuffer;
  readonly abortState: AbortState;
  readonly hookRunner: HookRunner;
  readonly runChild: (input: ChildRunInput) => AsyncIterable<RunEvent>;
}

export type RunFn = (input: RunInput) => AsyncIterable<RunEvent>;

export const isAborted = (state: RunState): boolean => {
  return state.abortState.aborted || (state.signal?.aborted ?? false);
};
