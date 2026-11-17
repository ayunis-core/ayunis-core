import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { fullyMatches } from 'src/common/anonymization/domain/whitelist-filter';
import { AnonymizationWhitelistEntry } from './anonymization-whitelist-entry.entity';
import {
  composeWhitelistPattern,
  rejectWhitelistException,
} from './whitelist-exception';

const orgId = '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c' as UUID;

function locationRule(pattern: string | null): AnonymizationWhitelistEntry {
  return new AnonymizationWhitelistEntry({
    orgId,
    category: PiiCategory.LOCATION,
    pattern,
  });
}

describe('composeWhitelistPattern', () => {
  it('appends the word to the existing rule, keeping what it exempted', () => {
    const pattern = composeWhitelistPattern('Marl|Herten', 'Bayern');

    expect(pattern).toBe('Marl|Herten|Bayern');
    expect(fullyMatches(pattern, 'Herten')).toBe(true);
    expect(fullyMatches(pattern, 'bayern')).toBe(true);
  });

  it.each([
    '.*',
    '.+',
    '\\w+',
    '[^x\\d\\s]{4,}',
    '(?!.*(x|Muster|Test|abc))[^\\d]{4,}',
    'Bayern|.*',
    'Bayern.*',
  ])(
    'exempts only the text %s itself, never what it would match as a regex',
    (word) => {
      const pattern = composeWhitelistPattern(null, word);

      expect(fullyMatches(pattern, word)).toBe(true);
      for (const other of ['Berlin', 'Hamburg', 'Bayern', 'Bayernx', '']) {
        expect(fullyMatches(pattern, other)).toBe(false);
      }
    },
  );
});

describe('rejectWhitelistException', () => {
  it('accepts a word next to the existing rule', () => {
    expect(
      rejectWhitelistException({
        currentEntry: locationRule('Marl|Herten'),
        word: 'Bayern',
      }),
    ).toBeNull();
  });

  it('accepts a word for a category without a rule', () => {
    expect(
      rejectWhitelistException({ currentEntry: undefined, word: 'Bayern' }),
    ).toBeNull();
  });

  it('refuses a category that is already exempt as a whole', () => {
    expect(
      rejectWhitelistException({
        currentEntry: locationRule(null),
        word: 'Bayern',
      }),
    ).toBe('category_fully_exempt');
  });

  it('refuses a word the current rule already exempts', () => {
    expect(
      rejectWhitelistException({
        currentEntry: locationRule('bayern'),
        word: 'Bayern',
      }),
    ).toBe('already_exempt');
  });

  it('rejects a word that pushes the rule over the length limit', () => {
    expect(
      rejectWhitelistException({
        currentEntry: locationRule('M'.repeat(995)),
        word: 'Bayern',
      }),
    ).toBe('too_long');
  });
});
