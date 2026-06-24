import type { TFunction } from 'i18next';

/**
 * Human-readable label for a retention window. Whole years render as years
 * (365 → "1 year", 730 → "2 years"); everything else renders in days.
 */
export function formatRetentionPeriod(days: number, t: TFunction): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return t('retention.year', { count: years });
  }
  return t('retention.days', { count: days });
}

/**
 * Whether changing the retention window from `current` to `next` makes deletion
 * start or become more aggressive — i.e. a destructive change that warrants a
 * confirmation. Enabling (current null → a value) or shortening the window
 * qualifies; disabling or lengthening it does not.
 */
export function isMoreAggressive(
  current: number | null,
  next: number | null,
): boolean {
  if (next === null) {
    return false;
  }
  if (current === null) {
    return true;
  }
  return next < current;
}
