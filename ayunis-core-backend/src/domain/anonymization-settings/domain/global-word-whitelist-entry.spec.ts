import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { fullyMatches } from 'src/common/anonymization/domain/whitelist-filter';
import { GlobalAnonymizationWhitelistWord } from './global-anonymization-whitelist-word.entity';
import { toWhitelistEntry } from './global-word-whitelist-entry';

function word(text: string): GlobalAnonymizationWhitelistWord {
  return new GlobalAnonymizationWhitelistWord({
    category: PiiCategory.PERSON_NAME,
    word: text,
    createdByUserId: null,
  });
}

describe('toWhitelistEntry', () => {
  it('produces a pattern matching the word case-insensitively as a whole', () => {
    const entry = toWhitelistEntry(word('Wir'));

    expect(entry.category).toBe(PiiCategory.PERSON_NAME);
    expect(fullyMatches(entry.pattern as string, 'wir')).toBe(true);
    expect(fullyMatches(entry.pattern as string, 'WIR')).toBe(true);
  });

  it('does not match values that merely contain the word', () => {
    const entry = toWhitelistEntry(word('Wir'));

    expect(fullyMatches(entry.pattern as string, 'Wirtschaft')).toBe(false);
    expect(fullyMatches(entry.pattern as string, 'sagen wir mal')).toBe(false);
  });

  it('escapes regex metacharacters so words match only literally', () => {
    const entry = toWhitelistEntry(word('Dr. Müller (Amt)'));

    expect(fullyMatches(entry.pattern as string, 'Dr. Müller (Amt)')).toBe(
      true,
    );
    expect(fullyMatches(entry.pattern as string, 'Drx Müller (Amt)')).toBe(
      false,
    );
  });
});
