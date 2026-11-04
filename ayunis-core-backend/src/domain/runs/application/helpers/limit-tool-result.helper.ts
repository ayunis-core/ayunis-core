import { MAX_TOOL_RESULT_LENGTH } from '@ayunis/agent-runtime';

import { MAX_ANONYMOUS_TOOL_RESULT_LENGTH } from 'src/common/util/tool-result-limits';
export { MAX_ANONYMOUS_TOOL_RESULT_LENGTH } from 'src/common/util/tool-result-limits';

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
