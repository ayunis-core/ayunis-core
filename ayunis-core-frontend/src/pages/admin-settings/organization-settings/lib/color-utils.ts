/**
 * Color utilities for the org primary-color picker.
 *
 * Mirrors the backend's color-validation logic so the UI can show live
 * feedback (contrast ratio, accessibility status) without a network round
 * trip. The backend still re-validates on save — this is purely UX.
 */

export const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
export const MIN_CONTRAST_RATIO = 4.5; // WCAG AA, normal text

export function isValidHex(value: string): boolean {
  return HEX_REGEX.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Best contrast achievable with white or black foreground. */
export function bestForegroundContrast(hex: string): {
  ratio: number;
  foreground: '#ffffff' | '#000000';
} {
  const lum = relativeLuminance(hex);
  const whiteContrast = contrastRatio(lum, 1);
  const blackContrast = contrastRatio(lum, 0);
  return whiteContrast >= blackContrast
    ? { ratio: whiteContrast, foreground: '#ffffff' }
    : { ratio: blackContrast, foreground: '#000000' };
}

export function meetsContrast(hex: string): boolean {
  if (!isValidHex(hex)) return false;
  return bestForegroundContrast(hex).ratio >= MIN_CONTRAST_RATIO;
}
