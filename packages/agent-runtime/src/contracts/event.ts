import type { AssistantMessage, Message, ProviderMetadata } from './message';
import type { ProviderFailureFacts, Usage } from './provider';

export interface RunEventEnvelope {
  runId: string;
  depth: number;
  path: readonly string[];
  timestamp: string;
}

export type RunStatus = 'completed' | 'aborted' | 'max_iterations' | 'error';

export interface CustomEventInput {
  name: string;
  data: unknown;
}

export interface ToolCallSummary {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolCallSnapshot {
  index: number;
  id: string | null;
  name: string | null;
  argumentsJson: string;
  input: Record<string, unknown> | null;
  providerMetadata?: ProviderMetadata;
  status: 'streaming' | 'invalid';
}

export type ModelCallTrigger =
  | 'initial'
  | 'provider_retry'
  | 'empty_recovery'
  | 'malformed_recovery'
  | 'fallback';

export interface TerminalModelCallInfo {
  readonly modelCallId: string;
  readonly runId: string;
  readonly turn: number;
  readonly callSequence: number;
  readonly trigger: ModelCallTrigger;
  readonly provider: string;
}

export type RunEventPayload =
  | { type: 'run_start'; maxIterations: number }
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'tool_call_snapshot'; toolCall: ToolCallSnapshot }
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
      modelCall?: TerminalModelCallInfo;
      providerFailure?: ProviderFailureFacts;
    }
  | {
      type: 'finalization_error';
      hookName: string;
      message: string;
      critical: boolean;
      outcome: RunStatus;
    }
  | { type: 'run_end'; status: RunStatus; usage: Usage };

export type RunEvent = RunEventEnvelope & RunEventPayload;
