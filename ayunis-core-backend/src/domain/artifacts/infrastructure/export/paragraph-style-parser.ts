import { AlignmentType, LineRuleType, type ISpacingProperties } from 'docx';
import type { HTMLElement } from 'node-html-parser';

const ALIGNMENT_MAP: Record<
  string,
  (typeof AlignmentType)[keyof typeof AlignmentType]
> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

export function parseAlignment(
  node: HTMLElement,
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const style = node.getAttribute('style') ?? '';
  const match = /text-align:\s*(left|center|right|justify)/.exec(style);
  return match ? ALIGNMENT_MAP[match[1]] : undefined;
}

/** Parses an inline `style` attribute into a `property -> value` map. */
function parseStyleDeclarations(style: string): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (property && value) declarations.set(property, value);
  }

  return declarations;
}

/** Strict numeric parse (unlike parseFloat, rejects trailing units like `em`). */
function toFiniteNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Converts a CSS length (`pt`, `px`, or a bare number) to twips (1/20 pt),
 * the unit `docx` uses for paragraph spacing. Returns undefined for units we
 * cannot resolve without a rendering context (e.g. `em`, `%`).
 */
function cssLengthToTwips(value: string): number | undefined {
  const trimmed = value.trim();

  // 1px = 1/96in and 1 twip = 1/1440in, so 1px = 15 twips. 1pt = 20 twips.
  let twipsPerUnit = 20;
  let numeric = trimmed;
  if (trimmed.endsWith('px')) {
    twipsPerUnit = 15;
    numeric = trimmed.slice(0, -2);
  } else if (trimmed.endsWith('pt')) {
    numeric = trimmed.slice(0, -2);
  }

  const amount = toFiniteNumber(numeric);
  return amount === undefined ? undefined : Math.round(amount * twipsPerUnit);
}

/** Maps a CSS `line-height` to `docx` line-spacing properties. */
function parseLineHeight(
  value: string,
): Partial<ISpacingProperties> | undefined {
  const trimmed = value.trim();

  if (trimmed.endsWith('pt')) {
    const pt = toFiniteNumber(trimmed.slice(0, -2));
    return pt === undefined
      ? undefined
      : { line: Math.round(pt * 20), lineRule: LineRuleType.EXACT };
  }

  // A unitless multiplier maps to auto line spacing measured in 240ths of a
  // line (240 = single, 360 = 1.5, 480 = double).
  const multiplier = toFiniteNumber(trimmed);
  return multiplier === undefined
    ? undefined
    : { line: Math.round(multiplier * 240), lineRule: LineRuleType.AUTO };
}

/**
 * Extracts paragraph spacing (`margin-top`/`margin-bottom`/`line-height`) from
 * an element's inline style. Without this, Word falls back to the defaults from
 * the Normal style (8pt after, 1.5 line spacing), ignoring the HTML styling.
 */
export function parseSpacing(
  node: HTMLElement,
): ISpacingProperties | undefined {
  const style = node.getAttribute('style') ?? '';
  if (!style) return undefined;

  const declarations = parseStyleDeclarations(style);
  let spacing: ISpacingProperties = {};

  const marginTop = declarations.get('margin-top');
  if (marginTop !== undefined) {
    const before = cssLengthToTwips(marginTop);
    if (before !== undefined) spacing = { ...spacing, before };
  }

  const marginBottom = declarations.get('margin-bottom');
  if (marginBottom !== undefined) {
    const after = cssLengthToTwips(marginBottom);
    if (after !== undefined) spacing = { ...spacing, after };
  }

  const lineHeight = declarations.get('line-height');
  if (lineHeight !== undefined) {
    const line = parseLineHeight(lineHeight);
    if (line) spacing = { ...spacing, ...line };
  }

  return Object.keys(spacing).length > 0 ? spacing : undefined;
}
