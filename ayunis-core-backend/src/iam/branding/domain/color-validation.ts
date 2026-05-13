/**
 * Color validation helpers for org branding.
 *
 * The frontend mirrors this logic to surface live feedback; the backend
 * enforces it so the persisted value always meets WCAG AA contrast against
 * either pure white or pure black foreground text.
 */

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const MIN_CONTRAST_RATIO = 4.5; // WCAG AA for normal text

export interface ColorValidationResult {
  ok: boolean;
  reason?: 'invalid_format' | 'insufficient_contrast';
  bestContrast?: number;
}

export function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function srgbToLinear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Contrast ratio between two relative-luminance values. */
function contrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Best achievable contrast for this primary color against either pure
 * white (luminance 1) or pure black (luminance 0) text. We pick whichever
 * gives more contrast.
 */
export function bestForegroundContrast(hex: string): number {
  const l = relativeLuminance(hex);
  return Math.max(contrastRatio(l, 1), contrastRatio(l, 0));
}

export function validatePrimaryColor(hex: string): ColorValidationResult {
  const normalized = normalizeHex(hex);
  if (!isValidHex(normalized)) {
    return { ok: false, reason: 'invalid_format' };
  }
  const contrast = bestForegroundContrast(normalized);
  if (contrast < MIN_CONTRAST_RATIO) {
    return {
      ok: false,
      reason: 'insufficient_contrast',
      bestContrast: contrast,
    };
  }
  return { ok: true, bestContrast: contrast };
}
