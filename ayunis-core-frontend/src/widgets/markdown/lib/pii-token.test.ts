import { describe, expect, it } from 'vitest';
import {
  splitPiiTokens,
  containsPiiToken,
  resolvePiiTokens,
} from './pii-token';

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

describe('resolvePiiTokens', () => {
  const masks = new Map([
    ['{{pii:PERSON_NAME_1}}', { value: 'Max Mustermann' }],
    ['{{pii:EMAIL_ADDRESS_1}}', { value: 'max@example.de' }],
  ]);

  it('replaces every known token with its value', () => {
    expect(
      resolvePiiTokens(
        'Hallo {{pii:PERSON_NAME_1}}, schreib an {{pii:EMAIL_ADDRESS_1}}',
        masks,
      ),
    ).toBe('Hallo Max Mustermann, schreib an max@example.de');
  });

  it('leaves unknown tokens as literal text', () => {
    expect(resolvePiiTokens('{{pii:LOCATION_2}}', masks)).toBe(
      '{{pii:LOCATION_2}}',
    );
  });

  it('returns the input unchanged when there are no tokens', () => {
    expect(resolvePiiTokens('plain text', masks)).toBe('plain text');
  });
});
