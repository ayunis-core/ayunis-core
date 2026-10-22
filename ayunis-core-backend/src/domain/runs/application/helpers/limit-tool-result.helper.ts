import { MAX_TOOL_RESULT_LENGTH } from '@ayunis/agent-runtime';

// Deliberately decoupled from MAX_ANONYMIZATION_TEXT_LENGTH: that cap is what
// the anonymizer can process, this one is how much of a PII-bearing tool
// result is worth sending to the model. Raising the anonymizer cap (AYC-1427)
// must not silently double the tokens a tool result costs.
export const MAX_ANONYMOUS_TOOL_RESULT_LENGTH = 30_000;

export function truncateAnonymousToolResult(result: string): {
  result: string;
  truncated: boolean;
} {
  return truncateToolResult(result, MAX_ANONYMOUS_TOOL_RESULT_LENGTH);
}

export function truncateToolResult(
  result: string,
  maxLength: number,
): { result: string; truncated: boolean } {
  if (result.length <= maxLength) return { result, truncated: false };

  return { result: result.slice(0, maxLength), truncated: true };
}

export function addToolResultTruncationNotice(result: string): string {
  return `${result}\n[result truncated]`;
}

export function limitToolResult(result: string): string {
  const limited = truncateToolResult(result, MAX_TOOL_RESULT_LENGTH);
  return limited.truncated
    ? addToolResultTruncationNotice(limited.result)
    : limited.result;
}
