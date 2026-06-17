import type { RunContext } from '../context/run-context';
import type { Hook } from './hook';
import type { Message } from './message';
import type { ModelProvider, ToolChoice } from './provider';
import type { Tool } from './tool';

export const DEFAULT_MAX_ITERATIONS = 20;

/**
 * Everything a run needs, passed flat — there is no runtime object and no
 * initialization step. The host resolves model selection/credentials and
 * concrete tools before calling run().
 */
export interface RunInput {
  /** System instructions (the host assembles the content). */
  instructions: string;
  /** A resolved model provider instance. */
  model: ModelProvider;
  tools?: Tool[];
  messages: Message[];
  hooks?: Hook[];
  /** Omit for a fresh root context. */
  context?: RunContext;
  signal?: AbortSignal;
  /** Default: 20. */
  maxIterations?: number;
  toolChoice?: ToolChoice;
}

/**
 * Input for a child (subagent) run via ToolExecutionContext.runChild.
 * The child context is derived automatically; hooks are inherited from
 * the parent unless explicitly overridden.
 */
export type ChildRunInput = Omit<RunInput, 'context'>;
