import type { RunContext } from '@ayunis/agent-runtime';

const DECLINED_TOOL_CALLS = Symbol('ayunis:declinedToolCalls');

/** Custom run event emitted when the user declines a call; data is `{ toolCallId }`. */
export const TOOL_CALL_DECLINED_EVENT = 'ayunis:tool_call_declined';

/**
 * Per-run record of tool calls the user declined. The runtime only carries a
 * result string and an error flag per call, and a declined call is neither a
 * result nor an error, so the persistence hook and the stream adapter read
 * the outcome from here instead.
 */
export function recordDeclinedToolCall(
  context: RunContext,
  toolCallId: string,
): void {
  const declined =
    context.get<Set<string>>(DECLINED_TOOL_CALLS) ?? new Set<string>();
  declined.add(toolCallId);
  context.set(DECLINED_TOOL_CALLS, declined);
}

export function wasToolCallDeclined(
  context: RunContext,
  toolCallId: string,
): boolean {
  return (
    context.get<Set<string>>(DECLINED_TOOL_CALLS)?.has(toolCallId) ?? false
  );
}
