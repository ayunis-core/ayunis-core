/**
 * Rewrites A1-style cell references in formula text when the sheet's
 * structure changes, mirroring Excel semantics:
 *
 * - references at a deleted index become #REF!
 * - references past a deleted index shift down, past an inserted index shift up
 * - ranges shrink instead of breaking when one endpoint is deleted, and only
 *   become #REF! when the whole range is deleted
 *
 * Coordinates are sheet coordinates (row 1 = headers, columns A.. = index 0..).
 * String literals ("...") are never touched.
 */

export interface ReferenceAdjustment {
  axis: 'row' | 'column';
  /** 0-based data index: column index, or data row index (sheet row - 2). */
  index: number;
  /** -1 = deleted at index, +1 = inserted at index. */
  delta: 1 | -1;
}

const STRING_LITERAL_SPLIT_RE = /("(?:[^"]|"")*")/;

const REF_RE = /(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?/gi;

export function columnLetterToIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function columnIndexToLetter(index: number): string {
  let letters = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

interface Endpoint {
  colAbs: string;
  col: number;
  rowAbs: string;
  row: number; // 1-based sheet row
}

function adjustEndpoint(
  endpoint: Endpoint,
  adjustment: ReferenceAdjustment,
  isRangeEnd: boolean,
): Endpoint | null {
  const { axis, index, delta } = adjustment;
  // Sheet-coordinate position of the structural change
  const target = axis === 'column' ? endpoint.col : endpoint.row - 2;

  if (delta === 1) {
    if (target >= index) {
      return shifted(endpoint, axis, 1);
    }
    return endpoint;
  }

  if (target > index) {
    return shifted(endpoint, axis, -1);
  }
  if (target === index) {
    // Deleted: single refs break; range endpoints shrink toward the gap.
    return isRangeEnd ? shifted(endpoint, axis, -1) : null;
  }
  return endpoint;
}

function shifted(
  endpoint: Endpoint,
  axis: 'row' | 'column',
  by: number,
): Endpoint {
  if (axis === 'column') {
    return { ...endpoint, col: endpoint.col + by };
  }
  return { ...endpoint, row: endpoint.row + by };
}

function renderEndpoint(endpoint: Endpoint): string {
  return `${endpoint.colAbs}${columnIndexToLetter(endpoint.col)}${endpoint.rowAbs}${endpoint.row}`;
}

function rewriteSegment(
  segment: string,
  adjustment: ReferenceAdjustment,
): string {
  return segment.replace(
    REF_RE,
    (
      _match,
      colAbs1: string,
      col1: string,
      rowAbs1: string,
      row1: string,
      colAbs2?: string,
      col2?: string,
      rowAbs2?: string,
      row2?: string,
    ) => {
      const start: Endpoint = {
        colAbs: colAbs1,
        col: columnLetterToIndex(col1),
        rowAbs: rowAbs1,
        row: Number(row1),
      };

      if (col2 === undefined || row2 === undefined) {
        const adjusted = adjustEndpoint(start, adjustment, false);
        return adjusted ? renderEndpoint(adjusted) : '#REF!';
      }

      const end: Endpoint = {
        colAbs: colAbs2 ?? '',
        col: columnLetterToIndex(col2),
        rowAbs: rowAbs2 ?? '',
        row: Number(row2),
      };

      const startTarget =
        adjustment.axis === 'column' ? start.col : start.row - 2;
      const endTarget = adjustment.axis === 'column' ? end.col : end.row - 2;
      const wholeRangeDeleted =
        adjustment.delta === -1 &&
        startTarget === adjustment.index &&
        endTarget === adjustment.index;
      if (wholeRangeDeleted) {
        return '#REF!';
      }

      const adjustedStart = adjustEndpoint(start, adjustment, false);
      const adjustedEnd = adjustEndpoint(end, adjustment, true);
      // Start endpoint deleted inside a surviving range: it keeps its index
      // (the next cell slides into place), matching Excel.
      const finalStart = adjustedStart ?? start;
      if (!adjustedEnd) {
        return '#REF!';
      }
      return `${renderEndpoint(finalStart)}:${renderEndpoint(adjustedEnd)}`;
    },
  );
}

export function adjustFormulaReferences(
  formula: string,
  adjustment: ReferenceAdjustment,
): string {
  return formula
    .split(STRING_LITERAL_SPLIT_RE)
    .map((segment, i) =>
      i % 2 === 1 ? segment : rewriteSegment(segment, adjustment),
    )
    .join('');
}
