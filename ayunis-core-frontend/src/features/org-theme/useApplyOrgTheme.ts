import { useEffect } from 'react';
import { useBranding } from '@/features/useBranding';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

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

function pickForeground(hex: string): '#ffffff' | '#000000' {
  const { r, g, b } = hexToRgb(hex);
  const luminance =
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b);
  // Pick whichever endpoint gives more contrast against the primary.
  const whiteContrast = (1 + 0.05) / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
}

/**
 * Applies the org's custom primary color as a CSS variable override on
 * <html>. Removes the override when the org clears its color (the
 * branding query no longer returns a primary color) or when `enabled`
 * is false (e.g. super-admin pages that must not be org-themed).
 *
 * Works for both light and dark mode — the override is set on :root so
 * it wins against both light and dark theme defaults.
 */
export function useApplyOrgTheme(enabled: boolean = true): void {
  const { branding } = useBranding();
  const primary = enabled ? (branding?.primaryColor ?? null) : null;

  useEffect(() => {
    const root = document.documentElement;
    if (primary && HEX_REGEX.test(primary)) {
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--primary-foreground', pickForeground(primary));
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
    }
  }, [primary]);
}
