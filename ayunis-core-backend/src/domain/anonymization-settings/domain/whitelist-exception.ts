import { fullyMatches } from 'src/common/anonymization/domain/whitelist-filter';
import type { AnonymizationWhitelistEntry } from './anonymization-whitelist-entry.entity';
import type { PatternValidationError } from './validate-pattern';
import { validatePattern } from './validate-pattern';

export type WhitelistExceptionRejection =
  PatternValidationError | 'category_fully_exempt' | 'already_exempt';

/**
 * The word is appended as an escaped literal alternative: every value the
 * previous rule exempted stays exempt, and the only value added is the word
 * itself. The chat card builds the same pattern, so keep the escaping in sync
 * with the frontend's `lib/anonymization-exception.ts`.
 */
export function composeWhitelistPattern(
  previousPattern: string | null,
  word: string,
): string {
  const literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return previousPattern === null ? literal : `${previousPattern}|${literal}`;
}

/**
 * Checks an exception that should stop `word` from being masked in one
 * category. It cannot apply to a category that is already exempt as a whole
 * or to a word the current rule already exempts, and the resulting rule must
 * still pass the save-time pattern check.
 */
export function rejectWhitelistException(params: {
  currentEntry: AnonymizationWhitelistEntry | undefined;
  word: string;
}): WhitelistExceptionRejection | null {
  const { currentEntry, word } = params;
  if (currentEntry?.pattern === null) return 'category_fully_exempt';
  const previousPattern = currentEntry?.pattern ?? null;
  if (previousPattern !== null && fullyMatches(previousPattern, word)) {
    return 'already_exempt';
  }
  return validatePattern(composeWhitelistPattern(previousPattern, word));
}
