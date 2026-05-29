import { describe, it, expect } from 'vitest';
import { isValidPasswordPolicy } from './password-policy';

describe('isValidPasswordPolicy', () => {
  it('accepts a password meeting all rules', () => {
    expect(isValidPasswordPolicy('Valid1Pass')).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(isValidPasswordPolicy('Ab1cdef')).toBe(false);
  });

  it('rejects passwords without an uppercase letter', () => {
    expect(isValidPasswordPolicy('lowercase1')).toBe(false);
  });

  it('rejects passwords without a lowercase letter', () => {
    expect(isValidPasswordPolicy('UPPERCASE1')).toBe(false);
  });

  it('rejects passwords without a digit', () => {
    expect(isValidPasswordPolicy('NoDigitsHere')).toBe(false);
  });
});
