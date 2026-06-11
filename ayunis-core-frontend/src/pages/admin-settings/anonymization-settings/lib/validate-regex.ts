export const MAX_PATTERN_LENGTH = 200;

export type RegexValidationError = 'too_long' | 'invalid_syntax';

/**
 * Client-side mirror of the backend pattern validation (length + syntax).
 * The backend additionally rejects ReDoS-prone patterns; that error is
 * surfaced from the save response.
 */
export function validateRegexPattern(
  pattern: string,
): RegexValidationError | null {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return 'too_long';
  }
  try {
    new RegExp(pattern, 'i');
    return null;
  } catch {
    return 'invalid_syntax';
  }
}
