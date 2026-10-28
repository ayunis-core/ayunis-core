export interface InferenceCallUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface InferenceCallTerminal {
  outcome: 'completed' | 'failed' | 'aborted';
  /** Cache reads and writes are already folded into `inputTokens`. */
  usage?: InferenceCallUsage;
}

/**
 * Invoked once per provider call after it can no longer produce output, and
 * awaited before the caller sees completion or failure. Calls that failed
 * before the provider emitted anything are not reported: nothing was consumed.
 * A rejection replaces the call's own result.
 */
export type InferenceCallTerminalHandler = (
  call: InferenceCallTerminal,
) => Promise<void>;
