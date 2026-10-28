import { describe, expect, it } from 'vitest';
import { MAX_PATTERN_LENGTH, validateRegexPattern } from './validate-regex';

describe('validateRegexPattern', () => {
  it('accepts a typical domain-anchoring pattern', () => {
    expect(validateRegexPattern('.*@stadt-marl\\.de')).toBeNull();
  });

  it('accepts an empty pattern', () => {
    expect(validateRegexPattern('')).toBeNull();
  });

  it('accepts a pattern at the length limit', () => {
    expect(MAX_PATTERN_LENGTH).toBe(1000);
    expect(validateRegexPattern('a'.repeat(1000))).toBeNull();
  });

  it('rejects a pattern exceeding the length limit', () => {
    expect(validateRegexPattern('a'.repeat(1001))).toBe('too_long');
  });

  it('rejects invalid regex syntax', () => {
    expect(validateRegexPattern('([')).toBe('invalid_syntax');
  });
});
