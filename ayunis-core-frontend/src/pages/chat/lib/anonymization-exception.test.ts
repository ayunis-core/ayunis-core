import { describe, expect, it } from 'vitest';
import type { PiiWhitelistEntryDto } from '@/shared/api';
import {
  isExceptionAccepted,
  isWordExempt,
  parseAnonymizationException,
  withException,
} from './anonymization-exception';

const masks = new Map([
  ['{{pii:LOCATION_1}}', { value: 'St. Peter' }],
  ['{{pii:LOCATION_2}}', { value: 'Bayern' }],
]);

const bayern = {
  category: 'location' as const,
  word: 'Bayern',
  pattern: 'Bayern',
};

describe('parseAnonymizationException', () => {
  it('resolves placeholders to the value and saves it as a literal', () => {
    expect(
      parseAnonymizationException(
        { category: 'location', word: '{{pii:LOCATION_1}}' },
        masks,
      ),
    ).toEqual({
      category: 'location',
      word: 'St. Peter',
      pattern: 'St\\. Peter',
    });
  });

  it('never saves a pattern the model wrote, only the word as a literal', () => {
    const exception = parseAnonymizationException(
      { category: 'location', word: 'Bayern|.*', pattern: '.*' },
      masks,
    );

    expect(exception?.pattern).toBe('Bayern\\|\\.\\*');
    expect(new RegExp(`^(?:${exception?.pattern})$`, 'i').test('Berlin')).toBe(
      false,
    );
  });

  it('offers nothing for a placeholder the thread does not know', () => {
    expect(
      parseAnonymizationException(
        { category: 'location', word: '{{pii:LOCATION_9}}' },
        masks,
      ),
    ).toBeNull();
  });
});

describe('withException', () => {
  it('keeps the other categories and every value the previous rule exempted', () => {
    const entries: PiiWhitelistEntryDto[] = [
      { category: 'email_address', pattern: null },
      { category: 'location', pattern: 'Marl|Herten' },
      { category: 'person_name', pattern: 'Dani(el)?' },
    ];

    expect(withException(entries, bayern)).toEqual([
      { category: 'email_address', pattern: null },
      { category: 'person_name', pattern: 'Dani(el)?' },
      { category: 'location', pattern: 'Marl|Herten|Bayern' },
    ]);
  });

  it('adds a rule for a category that had none', () => {
    expect(withException([], bayern)).toEqual([
      { category: 'location', pattern: 'Bayern' },
    ]);
  });

  it('never narrows a category that is exempt as a whole', () => {
    const entries: PiiWhitelistEntryDto[] = [
      { category: 'location', pattern: null },
    ];

    expect(withException(entries, bayern)).toEqual(entries);
  });
});

describe('isWordExempt', () => {
  it('treats the word as exempt once the saved rule matches it, so it is not offered again', () => {
    const saved = withException(
      [{ category: 'location', pattern: 'Marl' }],
      bayern,
    );

    expect(isWordExempt(saved, bayern)).toBe(true);
    expect(
      isWordExempt([{ category: 'location', pattern: 'Marl' }], bayern),
    ).toBe(false);
  });
});

describe('isExceptionAccepted', () => {
  it('accepts only the backend’s confirmation status, not a rejection', () => {
    expect(
      isExceptionAccepted('{"status":"awaiting_confirmation","message":"…"}'),
    ).toBe(true);
    expect(
      isExceptionAccepted(
        "The tool didn't provide any result due to the following error in tool usage: too generic",
      ),
    ).toBe(false);
    expect(isExceptionAccepted(undefined)).toBe(false);
  });
});
