import extractErrorData from '@/shared/api/extract-error-data';

const LIMIT_CODES = new Set([
  'QUOTA_EXCEEDED',
  'CREDIT_BUDGET_EXCEEDED',
  'USER_CREDIT_LIMIT_EXCEEDED',
  'TEAM_CREDIT_LIMIT_EXCEEDED',
]);

/**
 * The `common` translation key for a failed rewrite. Each improver endpoint
 * names its own empty-answer and anonymous-only codes.
 */
export function improveTextErrorKey(
  error: unknown,
  codes: { emptyAnswer: string; anonymousOnly: string },
): string {
  let code: string | undefined;
  try {
    code = extractErrorData(error).code;
  } catch {
    return 'improveText.error';
  }
  if (code === codes.emptyAnswer) return 'improveText.emptyAnswer';
  if (code === codes.anonymousOnly) return 'improveText.anonymousOnly';
  if (code === 'NO_DEFAULT_MODEL_FOUND') return 'improveText.noModel';
  if (code && LIMIT_CODES.has(code)) return 'improveText.limitReached';
  return 'improveText.error';
}
