import type { ArtifactPiiMaskResponseDto } from '@/shared/api';
import { resolvePiiTokens } from '@/widgets/markdown';
import type { SpreadsheetContent } from './spreadsheet-content-format';

/**
 * The sheet with the real values of an anonymous artifact's own dictionary
 * in place of its placeholders, in headers and string cells, formulas
 * included. Saving it back lets the backend restore the placeholders of
 * every string left unchanged.
 */
export function resolveSpreadsheetPlaceholders(
  data: SpreadsheetContent,
  piiMasks: readonly ArtifactPiiMaskResponseDto[] = [],
): SpreadsheetContent {
  if (piiMasks.length === 0) return data;
  const values = new Map(piiMasks.map((mask) => [mask.token, mask]));
  const resolve = (text: string) => resolvePiiTokens(text, values);
  return {
    columns: data.columns.map(resolve),
    rows: data.rows.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? resolve(cell) : cell)),
    ),
  };
}
