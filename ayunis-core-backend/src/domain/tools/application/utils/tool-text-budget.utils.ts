import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';

import { MAX_ANONYMOUS_TOOL_RESULT_LENGTH } from 'src/common/util/tool-result-limits';

export function textPrefixWithinBudget(text: string, budget: number): string {
  let low = 0;
  let high = Math.min(text.length, budget);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (JSON.stringify(text.slice(0, middle)).length - 2 <= budget)
      low = middle;
    else high = middle - 1;
  }
  if (
    low > 0 &&
    low < text.length &&
    /[\uD800-\uDBFF]/.test(text[low - 1]) &&
    /[\uDC00-\uDFFF]/.test(text[low])
  )
    low--;
  return text.slice(0, low);
}

export function serializeTextResult(result: object, toolName: string): string {
  const serialized = JSON.stringify(result);
  if (serialized.length >= MAX_ANONYMOUS_TOOL_RESULT_LENGTH) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'The result exceeds the safe response size. Request fewer lines.',
      exposeToLLM: true,
    });
  }
  return serialized;
}
