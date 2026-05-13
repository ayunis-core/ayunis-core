import {
  bestForegroundContrast,
  isValidHex,
  normalizeHex,
  validatePrimaryColor,
} from './color-validation';

describe('color-validation', () => {
  it('should normalize hex colors to lowercase', () => {
    expect(normalizeHex('  #3B82F6 ')).toBe('#3b82f6');
  });

  it('should accept 6-digit hex colors', () => {
    expect(isValidHex('#3b82f6')).toBe(true);
  });

  it.each(['blue', '#fff', '3b82f6', '#3b82f6ff'])(
    'should reject malformed color %s',
    (value) => {
      expect(validatePrimaryColor(value)).toEqual({
        ok: false,
        reason: 'invalid_format',
      });
    },
  );

  it('should report high contrast for a dark brand color (white text)', () => {
    expect(bestForegroundContrast('#1d4ed8')).toBeGreaterThan(4.5);
  });

  it('should accept even the lowest-contrast possible color', () => {
    // Contrast is measured against white OR black text, whichever is
    // better. That maximum is minimized at relative luminance ~0.18
    // (around #757575), where it still reaches ~4.58:1 — above the 4.5
    // threshold. The insufficient_contrast branch is therefore
    // unreachable; it exists as a defensive guard should the threshold
    // or foreground model ever change.
    const worstCase = validatePrimaryColor('#757575');
    expect(worstCase.ok).toBe(true);
    expect(worstCase.bestContrast).toBeGreaterThan(4.5);
    expect(worstCase.bestContrast).toBeLessThan(4.7);
  });
});
