import type { RunContext } from '../context/run-context';
import type { RunEvent } from '../contracts/event';
import type { Message } from '../contracts/message';
import type { ModelProvider, ToolChoice } from '../contracts/provider';
import type {
  ChildRunInput,
  ResolvedRetryConfig,
  RunInput,
} from '../contracts/run-input';
import type { Tool } from '../contracts/tool';
import type { EmitBuffer } from './event-queue';
import type { HookRunner } from './hook-runner';
import type { PendingMutations } from './mutations';

export class AbortState {
  private readonly controller = new AbortController();
  reason?: string;

  get aborted(): boolean {
    return this.controller.signal.aborted;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  abort(reason?: string): void {
    if (this.aborted) return;
    this.reason = reason;
    this.controller.abort(new Error(reason ?? 'Run aborted by hook'));
  }
}

export interface RunUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheWriteInputTokens: number;
}

export interface RunState {
  readonly context: RunContext;
  readonly model: ModelProvider;
  messages: Message[];
  tools: Tool[];
  instructions: string;
  readonly toolChoice?: ToolChoice;
  readonly signal?: AbortSignal;
  readonly consumerSignal: AbortSignal;
  readonly maxIterations: number;
  readonly retry: ResolvedRetryConfig;
  readonly modelCallIdleTimeoutMs: number;
  readonly usage: RunUsageTotals;
  readonly mutations: PendingMutations;
  readonly emits: EmitBuffer;
  readonly abortState: AbortState;
  readonly hookRunner: HookRunner;
  readonly runChild: (input: ChildRunInput) => AsyncIterable<RunEvent>;
}

export type RunFn = (input: RunInput) => AsyncIterable<RunEvent>;

export const isHookAborted = (state: RunState): boolean =>
  state.abortState.aborted;

export const isSignalAborted = (state: RunState): boolean =>
  state.signal?.aborted ?? false;

export const isConsumerAbandoned = (state: RunState): boolean =>
  state.consumerSignal.aborted;

export const isAborted = (state: RunState): boolean =>
  isHookAborted(state) || isSignalAborted(state) || isConsumerAbandoned(state);
