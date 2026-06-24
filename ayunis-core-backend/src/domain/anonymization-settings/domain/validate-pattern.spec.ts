import { validatePattern, MAX_PATTERN_LENGTH } from './validate-pattern';

describe('validatePattern', () => {
  it('accepts a typical domain-anchoring pattern', () => {
    expect(validatePattern('.*@stadt-marl\\.de')).toBeNull();
  });

  it('rejects an empty pattern', () => {
    expect(validatePattern('')).toBe('empty');
  });

  it('rejects a pattern exceeding the length limit', () => {
    expect(validatePattern('a'.repeat(MAX_PATTERN_LENGTH + 1))).toBe(
      'too_long',
    );
  });

  it('rejects a pattern with invalid regex syntax', () => {
    expect(validatePattern('([')).toBe('invalid_syntax');
  });

  it('rejects a pattern vulnerable to catastrophic backtracking', () => {
    expect(validatePattern('(a+)+$')).toBe('unsafe');
  });
});
