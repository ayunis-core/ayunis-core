import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { GlobalAnonymizationWhitelistWord } from './global-anonymization-whitelist-word.entity';

/**
 * Converts a global whitelist word into a whitelist entry whose pattern
 * matches the word literally — regex metacharacters are escaped so e.g.
 * "Dr." cannot match "Drx". Case-insensitive whole-value matching comes
 * from the whitelist filter itself.
 */
export function toWhitelistEntry(
  word: GlobalAnonymizationWhitelistWord,
): PiiWhitelistEntry {
  return new PiiWhitelistEntry(word.category, escapeRegExp(word.word));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
