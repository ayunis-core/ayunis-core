import { validatePattern, MAX_PATTERN_LENGTH } from './validate-pattern';

function addressAlternation(maxLength: number): string {
  const alternatives: string[] = [];
  let length = 0;
  for (let i = 1; ; i++) {
    const alternative = `Musterstraße ${i}, 45772 Marl`;
    const added = length === 0 ? alternative.length : alternative.length + 1;
    if (length + added > maxLength) {
      return alternatives.join('|');
    }
    alternatives.push(alternative);
    length += added;
  }
}

describe('validatePattern', () => {
  it('accepts a typical domain-anchoring pattern', () => {
    expect(validatePattern('.*@stadt-marl\\.de')).toBeNull();
  });

  it('rejects an empty pattern', () => {
    expect(validatePattern('')).toBe('empty');
  });

  it('accepts a pattern at the length limit', () => {
    expect(MAX_PATTERN_LENGTH).toBe(1000);
    expect(validatePattern('a'.repeat(1000))).toBeNull();
  });

  it('rejects a pattern exceeding the length limit', () => {
    expect(validatePattern('a'.repeat(1001))).toBe('too_long');
  });

  it('accepts a long list of exempt addresses', () => {
    const pattern = addressAlternation(MAX_PATTERN_LENGTH);

    expect(pattern.length).toBeGreaterThan(900);
    expect(validatePattern(pattern)).toBeNull();
  });

  it('rejects a pattern with invalid regex syntax', () => {
    expect(validatePattern('([')).toBe('invalid_syntax');
  });

  it('rejects a pattern vulnerable to catastrophic backtracking', () => {
    expect(validatePattern('(a+)+$')).toBe('unsafe');
  });
});
