import type { PiiCategory, PiiWhitelistEntryDto } from '@/shared/api';
import { PII_CATEGORIES } from '../model/types';
import type { RowsState } from '../model/types';
import { validateRegexPattern } from './validate-regex';
import type { RegexValidationError } from './validate-regex';

export function buildRows(entries: PiiWhitelistEntryDto[]): RowsState {
  const rows = {} as RowsState;
  for (const category of PII_CATEGORIES) {
    rows[category] = { enabled: false, pattern: '' };
  }
  for (const entry of entries) {
    rows[entry.category] = {
      enabled: true,
      pattern: entry.pattern ?? '',
    };
  }
  return rows;
}

export function toEntries(rows: RowsState): PiiWhitelistEntryDto[] {
  return PII_CATEGORIES.filter((category) => rows[category].enabled).map(
    (category) => {
      const pattern = rows[category].pattern.trim();
      return { category, pattern: pattern.length > 0 ? pattern : null };
    },
  );
}

export type RowErrors = Partial<Record<PiiCategory, RegexValidationError>>;

export function validateRows(rows: RowsState): RowErrors {
  const errors: RowErrors = {};
  for (const category of PII_CATEGORIES) {
    const row = rows[category];
    if (!row.enabled) continue;
    const error = validateRegexPattern(row.pattern.trim());
    if (error) {
      errors[category] = error;
    }
  }
  return errors;
}
