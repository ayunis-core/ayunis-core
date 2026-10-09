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

/** Parses inline declarations without collapsing repeated properties. */
function parseStyleDeclarations(style: string): Array<[string, string]> {
  const declarations: Array<[string, string]> = [];

  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (property && value) declarations.push([property, value]);
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

  // An absolute unit (`pt`/`px`) maps to a fixed (exact) line height.
  if (trimmed.endsWith('pt') || trimmed.endsWith('px')) {
    const twips = cssLengthToTwips(trimmed);
    return twips === undefined
      ? undefined
      : { line: twips, lineRule: LineRuleType.EXACT };
  }

  // A unitless multiplier (or percentage) maps to auto line spacing measured
  // in 240ths of a line (240 = single, 360 = 1.5, 480 = double).
  const multiplier = trimmed.endsWith('%')
    ? divideBy100(toFiniteNumber(trimmed.slice(0, -1)))
    : toFiniteNumber(trimmed);
  return multiplier === undefined
    ? undefined
    : { line: Math.round(multiplier * 240), lineRule: LineRuleType.AUTO };
}

function divideBy100(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value / 100;
}

function lengthToSpacing(
  key: 'before' | 'after',
  value: string,
): Partial<ISpacingProperties> | undefined {
  const twips = value.trim() === 'auto' ? 0 : cssLengthToTwips(value);
  return twips === undefined ? undefined : { [key]: twips };
}

/** `margin: top [right [bottom [left]]]` — bottom falls back to top. */
function parseMarginShorthand(
  value: string,
): Partial<ISpacingProperties> | undefined {
  const [top, , bottom = top] = value.trim().split(/\s+/);
  return {
    ...lengthToSpacing('before', top),
    ...lengthToSpacing('after', bottom),
  };
}

const SPACING_PARSERS: Partial<
  Record<string, (value: string) => Partial<ISpacingProperties> | undefined>
> = {
  margin: parseMarginShorthand,
  'margin-top': (value) => lengthToSpacing('before', value),
  'margin-bottom': (value) => lengthToSpacing('after', value),
  'line-height': parseLineHeight,
};

/**
 * Extracts paragraph spacing (`margin`/`margin-top`/`margin-bottom`/
 * `line-height`) from an element's inline style, in declaration order so a
 * later longhand overrides the shorthand. Without this, Word falls back to the
 * defaults from the Normal style (8pt after, 1.5 line spacing).
 */
export function parseSpacing(
  node: HTMLElement,
): ISpacingProperties | undefined {
  const style = node.getAttribute('style') ?? '';
  if (!style) return undefined;

  let spacing: ISpacingProperties = {};
  for (const [property, value] of parseStyleDeclarations(style)) {
    const parsed = SPACING_PARSERS[property]?.(value);
    if (parsed) spacing = { ...spacing, ...parsed };
  }

  return Object.keys(spacing).length > 0 ? spacing : undefined;
}
