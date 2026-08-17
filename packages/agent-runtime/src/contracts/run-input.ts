import type { RunContext } from '../context/run-context';
import type { RunEvent } from './event';
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
  /** Maximum complete model-and-tool iterations. Default: 20. */
  maxIterations?: number;
  toolChoice?: ToolChoice;
  /** Optional host override for child execution. */
  childRunHandler?: ChildRunHandler;
}

/**
 * Input for a child (subagent) run via ToolExecutionContext.runChild.
 * The child context and selected handler are controlled by the parent run.
 */
export type ChildRunInput = Omit<RunInput, 'context' | 'childRunHandler'>;

/** Receives a child input with its already-derived child context. */
export type ChildRunHandler = (input: RunInput) => AsyncIterable<RunEvent>;
