import safeRegex from 'safe-regex2';

export const MAX_PATTERN_LENGTH = 200;

export type PatternValidationError =
  | 'empty'
  | 'too_long'
  | 'invalid_syntax'
  | 'unsafe';

/**
 * Validates an admin-supplied whitelist regex at save time. Patterns are
 * later executed server-side against detected PII spans, so reject anything
 * that does not compile or is vulnerable to catastrophic backtracking.
 */
export function validatePattern(
  pattern: string,
): PatternValidationError | null {
  if (pattern.length === 0) {
    return 'empty';
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return 'too_long';
  }
  try {
    new RegExp(pattern, 'i');
  } catch {
    return 'invalid_syntax';
  }
  if (!safeRegex(pattern)) {
    return 'unsafe';
  }
  return null;
}
