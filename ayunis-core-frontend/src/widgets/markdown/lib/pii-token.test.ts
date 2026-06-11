import { describe, expect, it } from 'vitest';
import { splitPiiTokens, containsPiiToken } from './pii-token';

describe('splitPiiTokens', () => {
  it('returns a single text part when there are no tokens', () => {
    expect(splitPiiTokens('Hallo Welt')).toEqual([
      { kind: 'text', text: 'Hallo Welt' },
    ]);
  });

  it('splits a token in the middle of text', () => {
    expect(splitPiiTokens('Schreib an {{pii:PERSON_NAME_1}} heute')).toEqual([
      { kind: 'text', text: 'Schreib an ' },
      { kind: 'token', token: '{{pii:PERSON_NAME_1}}' },
      { kind: 'text', text: ' heute' },
    ]);
  });

  it('handles tokens at the start and end of text', () => {
    expect(
      splitPiiTokens('{{pii:PERSON_NAME_1}} und {{pii:LOCATION_2}}'),
    ).toEqual([
      { kind: 'token', token: '{{pii:PERSON_NAME_1}}' },
      { kind: 'text', text: ' und ' },
      { kind: 'token', token: '{{pii:LOCATION_2}}' },
    ]);
  });

  it('handles adjacent tokens without separator', () => {
    expect(splitPiiTokens('{{pii:OTHER_1}}{{pii:OTHER_2}}')).toEqual([
      { kind: 'token', token: '{{pii:OTHER_1}}' },
      { kind: 'token', token: '{{pii:OTHER_2}}' },
    ]);
  });

  it('does not match legacy bracket placeholders', () => {
    expect(splitPiiTokens('Hallo [PERSON], wie geht es?')).toEqual([
      { kind: 'text', text: 'Hallo [PERSON], wie geht es?' },
    ]);
  });

  it('does not match malformed tokens', () => {
    const malformed = '{{pii:}} {{pii:lowercase_1}} {{pii:PERSON_NAME}}';
    expect(splitPiiTokens(malformed)).toEqual([
      { kind: 'text', text: malformed },
    ]);
  });
});

describe('containsPiiToken', () => {
  it('detects tokens regardless of prior calls', () => {
    expect(containsPiiToken('a {{pii:PERSON_NAME_1}} b')).toBe(true);
    expect(containsPiiToken('a {{pii:PERSON_NAME_1}} b')).toBe(true);
    expect(containsPiiToken('plain text')).toBe(false);
  });
});
