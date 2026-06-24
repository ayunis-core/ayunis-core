import type { AssistantMessage, Message } from './message';
import type { Usage } from './provider';

/**
 * Every event carries the nesting envelope so consumers can attribute
 * events to nested (subagent) runs or flatten them. `depth` is 0 for the
 * root run; `path` lists run ids from root to the emitting run.
 */
export interface RunEventEnvelope {
  runId: string;
  depth: number;
  path: readonly string[];
  timestamp: string;
}

export type RunStatus = 'completed' | 'aborted' | 'max_iterations' | 'error';

/** Input to `emit` from hooks and tools; becomes a `custom` RunEvent. */
export interface CustomEventInput {
  name: string;
  data: unknown;
}

export interface ToolCallSummary {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type RunEventPayload =
  | { type: 'run_start'; maxIterations: number }
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'tool_call'; toolCall: ToolCallSummary }
  | { type: 'assistant_message'; message: AssistantMessage; usage?: Usage }
  | {
      type: 'tool_result';
      toolCallId: string;
      toolName: string;
      result: string;
      isError: boolean;
    }
  | { type: 'tool_result_message'; message: Message }
  | { type: 'custom'; name: string; data: unknown }
  | {
      type: 'error';
      code: string;
      message: string;
      details?: Readonly<Record<string, unknown>>;
    }
  | { type: 'run_end'; status: RunStatus; usage: Usage };

export type RunEvent = RunEventEnvelope & RunEventPayload;
