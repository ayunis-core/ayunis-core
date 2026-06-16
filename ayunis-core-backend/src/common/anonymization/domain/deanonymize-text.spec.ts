import { deanonymizeText } from './deanonymize-text';

describe('deanonymizeText', () => {
  it('replaces known tokens with their values', () => {
    const map = new Map([
      ['{{pii:PERSON_NAME_1}}', 'Max Mustermann'],
      ['{{pii:EMAIL_ADDRESS_1}}', 'max@example.de'],
    ]);
    expect(
      deanonymizeText(
        'Hallo {{pii:PERSON_NAME_1}}, schreib an {{pii:EMAIL_ADDRESS_1}}',
        map,
      ),
    ).toBe('Hallo Max Mustermann, schreib an max@example.de');
  });

  it('leaves unknown tokens as literal text', () => {
    const map = new Map([['{{pii:PERSON_NAME_1}}', 'Max']]);
    expect(deanonymizeText('{{pii:LOCATION_2}}', map)).toBe(
      '{{pii:LOCATION_2}}',
    );
  });

  it('is a no-op when there are no tokens', () => {
    const map = new Map([['{{pii:PERSON_NAME_1}}', 'Max']]);
    expect(deanonymizeText('plain text', map)).toBe('plain text');
  });

  it('replaces repeated occurrences of the same token', () => {
    const map = new Map([['{{pii:PERSON_NAME_1}}', 'Max']]);
    expect(
      deanonymizeText('{{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_1}}', map),
    ).toBe('Max und Max');
  });

  it('does not touch legacy bracket placeholders', () => {
    expect(deanonymizeText('Hallo [PERSON]', new Map())).toBe('Hallo [PERSON]');
  });
});
