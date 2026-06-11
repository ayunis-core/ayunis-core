import type { PiiCategory } from './pii-category.enum';

/**
 * A single org whitelist rule: values of this category are exempt from
 * anonymization — unconditionally when pattern is null, otherwise only when
 * the full detected value matches the pattern (case-insensitive).
 */
export class PiiWhitelistEntry {
  constructor(
    public readonly category: PiiCategory,
    public readonly pattern: string | null,
  ) {}
}
