import type { HTMLElement } from 'node-html-parser';
import { parseStyleDeclarations } from './paragraph-style-parser';

export interface RunColors {
  color?: string;
  shading?: string;
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,[^)]*)?\)$/i;

/** Converts a CSS hex or rgb() color to the 6-digit hex `docx` expects. */
export function cssColorToHex(value: string): string | undefined {
  const hex = HEX_COLOR.exec(value)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
    return full.toUpperCase();
  }

  const rgb = RGB_COLOR.exec(value);
  if (!rgb) return undefined;
  const channels = rgb.slice(1, 4).map(Number);
  if (channels.some((channel) => channel > 255)) return undefined;
  return channels
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** Reads text and background colors from an inline element's style. */
export function parseRunColors(node: HTMLElement): RunColors {
  const colors: RunColors = {};

  for (const [property, value] of parseStyleDeclarations(
    node.getAttribute('style') ?? '',
  )) {
    const hex = cssColorToHex(value);
    if (!hex) continue;
    if (property === 'color') colors.color = hex;
    if (property === 'background-color') colors.shading = hex;
  }

  return colors;
}
