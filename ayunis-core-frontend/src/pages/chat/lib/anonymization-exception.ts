import { PiiCategory } from '@/shared/api';
import type { PiiWhitelistEntryDto } from '@/shared/api';
import { resolvePiiTokens } from '@/widgets/markdown';

const PII_TOKEN = /\{\{pii:[A-Z][A-Z0-9_]*_\d+\}\}/;

const ACCEPTED_STATUS = 'awaiting_confirmation';

export interface AnonymizationException {
  category: PiiCategory;
  /** The original value, with placeholders resolved. */
  word: string;
  /** The word as an escaped literal, as it is appended to the rule. */
  pattern: string;
}

type MaskMap = ReadonlyMap<string, { value: string }>;

/**
 * Resolves the call's placeholders like the backend did before validating
 * it, so the card shows and saves the word the backend accepted. The word is
 * saved as an escaped literal; the escaping mirrors the backend's
 * `composeWhitelistPattern`.
 */
export function parseAnonymizationException(
  params: unknown,
  masks: MaskMap,
): AnonymizationException | null {
  if (typeof params !== 'object' || params === null) return null;
  const { category, word } = params as Record<string, unknown>;
  if (!isPiiCategory(category) || typeof word !== 'string') return null;
  const resolvedWord = resolvePiiTokens(word, masks);
  if (PII_TOKEN.test(resolvedWord)) return null;
  return {
    category,
    word: resolvedWord,
    pattern: resolvedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  };
}

export function isExceptionAccepted(result: string | undefined): boolean {
  if (!result) return false;
  try {
    const parsed: unknown = JSON.parse(result);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { status?: unknown }).status === ACCEPTED_STATUS
    );
  } catch {
    return false;
  }
}

/** `undefined` when the category has no rule, `null` when it is fully exempt. */
export function currentPattern(
  entries: readonly PiiWhitelistEntryDto[],
  category: PiiCategory,
): string | null | undefined {
  return entries.find((entry) => entry.category === category)?.pattern;
}

/** Appended as an alternative, so every value the rule exempted stays exempt. */
export function exceptionRulePattern(
  previousPattern: string | undefined,
  exceptionPattern: string,
): string {
  return previousPattern === undefined
    ? exceptionPattern
    : `${previousPattern}|${exceptionPattern}`;
}

export function isWordExempt(
  entries: readonly PiiWhitelistEntryDto[],
  exception: AnonymizationException,
): boolean {
  const pattern = currentPattern(entries, exception.category);
  if (pattern === undefined) return false;
  return pattern === null || fullyMatches(pattern, exception.word);
}

/**
 * The whole whitelist with the exception added; other categories are kept and
 * a category that is already exempt as a whole stays so.
 */
export function withException(
  entries: readonly PiiWhitelistEntryDto[],
  exception: AnonymizationException,
): PiiWhitelistEntryDto[] {
  const previousPattern = currentPattern(entries, exception.category);
  if (previousPattern === null) return [...entries];
  const pattern = exceptionRulePattern(previousPattern, exception.pattern);
  const others = entries.filter(
    (entry) => entry.category !== exception.category,
  );
  return [...others, { category: exception.category, pattern }];
}

// Mirrors the backend whitelist filter: case-insensitive, whole value.
function fullyMatches(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, 'i').test(value);
  } catch {
    return false;
  }
}

function isPiiCategory(value: unknown): value is PiiCategory {
  return (
    typeof value === 'string' &&
    (Object.values(PiiCategory) as string[]).includes(value)
  );
}
