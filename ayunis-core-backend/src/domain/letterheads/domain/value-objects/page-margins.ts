import { InvalidPageMarginsError } from '../../application/letterheads.errors';

/**
 * Margins for a page type (first page or continuation pages), in millimeters.
 */
export interface PageMargins {
  /** Top margin in mm */
  top: number;
  /** Bottom margin in mm */
  bottom: number;
  /** Left margin in mm */
  left: number;
  /** Right margin in mm */
  right: number;
}

const MARGIN_KEYS: ReadonlyArray<keyof PageMargins> = [
  'top',
  'bottom',
  'left',
  'right',
];

/**
 * Creates a validated PageMargins object.
 * All margins must be non-negative finite numbers.
 */
export function createPageMargins(input: PageMargins): PageMargins {
  for (const key of MARGIN_KEYS) {
    const value = input[key];
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidPageMarginsError(key, value);
    }
  }
  return {
    top: input.top,
    bottom: input.bottom,
    left: input.left,
    right: input.right,
  };
}
