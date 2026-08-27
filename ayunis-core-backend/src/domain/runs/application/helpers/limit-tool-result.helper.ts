import { MAX_TOOL_RESULT_LENGTH } from '@ayunis/agent-runtime';

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
