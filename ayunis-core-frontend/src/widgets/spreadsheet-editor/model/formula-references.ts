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

// Boundaries keep function names out: the lookbehind rejects matches inside
// longer identifiers (the TAN2 in ATAN2) and the lookahead rejects tokens
// that continue as an identifier or call (LOG10( is a function, not LOG10).
const REF_RE =
  /(?<![A-Z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Z0-9_(])/gi;
const FULL_COLUMN_REF_RE =
  /(?<![A-Z0-9_.])(\$?)([A-Z]{1,3}):(?:(\$?)([A-Z]{1,3}))(?![A-Z0-9_(])/gi;
const LOCAL_SHEET_NAME = 'SHEET1';
const SHEET_QUALIFIER_PATTERN = "(?:'(?:[^']|'')+'|[A-Z0-9_][A-Z0-9_.]*)";
const SHEET_QUALIFIED_ENDPOINT_PATTERN = '\\$?[A-Z]{1,3}(?:\\$?\\d+)?';
const SHEET_QUALIFIED_REF_RE = new RegExp(
  `(?:${SHEET_QUALIFIER_PATTERN}!)${SHEET_QUALIFIED_ENDPOINT_PATTERN}` +
    `(?::(?:${SHEET_QUALIFIER_PATTERN}!)?${SHEET_QUALIFIED_ENDPOINT_PATTERN})?`,
  'gi',
);
const PROTECTED_REFERENCE_RE = /__AYUNIS_SHEET_REFERENCE_(\d+)__/g;
const SHEET_QUALIFIER_RE = /^(?:'((?:[^']|'')+)'|([A-Z0-9_][A-Z0-9_.]*))!/i;
const RANGE_WITH_QUALIFIED_END_RE = new RegExp(
  `^((?:${SHEET_QUALIFIER_PATTERN}!)${SHEET_QUALIFIED_ENDPOINT_PATTERN}:)` +
    `((?:${SHEET_QUALIFIER_PATTERN})!${SHEET_QUALIFIED_ENDPOINT_PATTERN})$`,
  'i',
);

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

interface ColumnEndpoint {
  colAbs: string;
  col: number;
}

function adjustEndpoint(
  endpoint: Endpoint,
  adjustment: ReferenceAdjustment,
  isRange: boolean,
  isRangeEnd: boolean,
): Endpoint | null {
  const { axis, index, delta } = adjustment;
  // Sheet-coordinate position of the structural change
  const target = axis === 'column' ? endpoint.col : endpoint.row - 2;

  if (delta === 1) {
    if (
      target > index ||
      (!isRange && target === index) ||
      (isRangeEnd && target === index)
    ) {
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
        const adjusted = adjustEndpoint(start, adjustment, false, false);
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

      const adjustedStart = adjustEndpoint(start, adjustment, true, false);
      const adjustedEnd = adjustEndpoint(end, adjustment, true, true);
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

function rewriteFullColumnSegment(
  segment: string,
  adjustment: ReferenceAdjustment,
): string {
  if (adjustment.axis !== 'column') {
    return segment;
  }

  return segment.replace(
    FULL_COLUMN_REF_RE,
    (_match, colAbs1: string, col1: string, colAbs2: string, col2: string) => {
      const start: ColumnEndpoint = {
        colAbs: colAbs1,
        col: columnLetterToIndex(col1),
      };
      const end: ColumnEndpoint = {
        colAbs: colAbs2,
        col: columnLetterToIndex(col2),
      };
      const wholeRangeDeleted =
        adjustment.delta === -1 &&
        start.col === adjustment.index &&
        end.col === adjustment.index;
      if (wholeRangeDeleted) {
        return '#REF!';
      }

      const adjustedStart = adjustColumnEndpoint(
        start,
        adjustment,
        true,
        false,
      );
      const adjustedEnd = adjustColumnEndpoint(end, adjustment, true, true);
      const finalStart = adjustedStart ?? start;
      if (!adjustedEnd) {
        return '#REF!';
      }
      return `${renderColumnEndpoint(finalStart)}:${renderColumnEndpoint(adjustedEnd)}`;
    },
  );
}

function isLocalSheetName(name: string): boolean {
  return name.replaceAll("''", "'").toUpperCase() === LOCAL_SHEET_NAME;
}

function sheetNameOf(qualified: string): string | undefined {
  const qualifier = SHEET_QUALIFIER_RE.exec(qualified);
  return qualifier?.[1] ?? qualifier?.[2];
}

/**
 * Excel canonicalises `Sheet1!B2:Sheet1!D4` to `Sheet1!B2:D4`, but pasted or
 * model-written formulas can keep the redundant qualifier. REF_RE cannot parse
 * that shape as one range, so left alone each endpoint matches as a lone cell
 * and a delete emits `#REF!` instead of shrinking the range. Returns null when
 * the end names another sheet, which local coordinates cannot express.
 */
function collapseRedundantLocalRangeEnd(reference: string): string | null {
  const range = RANGE_WITH_QUALIFIED_END_RE.exec(reference);
  if (!range) {
    return reference;
  }

  const [, head, end] = range;
  const qualifier = SHEET_QUALIFIER_RE.exec(end);
  const endSheet = qualifier?.[1] ?? qualifier?.[2];
  if (
    qualifier === null ||
    endSheet === undefined ||
    !isLocalSheetName(endSheet)
  ) {
    return null;
  }
  return head + end.slice(qualifier[0].length);
}

function rewriteLocalReferences(
  segment: string,
  rewrite: (localSegment: string) => string,
): string {
  const protectedReferences: string[] = [];
  const localSegment = segment.replace(SHEET_QUALIFIED_REF_RE, (reference) => {
    const sheetName = sheetNameOf(reference);
    if (sheetName !== undefined && isLocalSheetName(sheetName)) {
      const collapsed = collapseRedundantLocalRangeEnd(reference);
      if (collapsed !== null) {
        return collapsed;
      }
    }

    const index = protectedReferences.push(reference) - 1;
    return `__AYUNIS_SHEET_REFERENCE_${index}__`;
  });

  return rewrite(localSegment).replace(
    PROTECTED_REFERENCE_RE,
    (_match, index: string) => protectedReferences[Number(index)] ?? '',
  );
}

function adjustColumnEndpoint(
  endpoint: ColumnEndpoint,
  adjustment: ReferenceAdjustment,
  isRange: boolean,
  isRangeEnd: boolean,
): ColumnEndpoint | null {
  const { index, delta } = adjustment;
  if (delta === 1) {
    if (
      endpoint.col > index ||
      (isRangeEnd && endpoint.col === index) ||
      (!isRange && endpoint.col === index)
    ) {
      return { ...endpoint, col: endpoint.col + 1 };
    }
    return endpoint;
  }
  if (endpoint.col > index) {
    return { ...endpoint, col: endpoint.col - 1 };
  }
  if (endpoint.col === index) {
    return isRangeEnd ? { ...endpoint, col: endpoint.col - 1 } : null;
  }
  return endpoint;
}

function renderColumnEndpoint(endpoint: ColumnEndpoint): string {
  return `${endpoint.colAbs}${columnIndexToLetter(endpoint.col)}`;
}

export function adjustFormulaReferences(
  formula: string,
  adjustment: ReferenceAdjustment,
): string {
  return formula
    .split(STRING_LITERAL_SPLIT_RE)
    .map((segment, i) =>
      i % 2 === 1
        ? segment
        : rewriteLocalReferences(segment, (localSegment) =>
            rewriteFullColumnSegment(
              rewriteSegment(localSegment, adjustment),
              adjustment,
            ),
          ),
    )
    .join('');
}

/**
 * Remaps every column reference through a permutation (used for column
 * reordering, where each old index maps to a new one). Range endpoints are
 * remapped individually and re-normalized so the rectangle stays the same,
 * matching how Excel follows moved cells.
 */
export function remapFormulaColumns(
  formula: string,
  mapColumn: (index: number) => number,
): string {
  const remapSegment = (segment: string): string => {
    const withCellReferences = segment.replace(
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
          col: mapColumn(columnLetterToIndex(col1)),
          rowAbs: rowAbs1,
          row: Number(row1),
        };

        if (col2 === undefined || row2 === undefined) {
          return renderEndpoint(start);
        }

        let end: Endpoint = {
          colAbs: colAbs2 ?? '',
          col: mapColumn(columnLetterToIndex(col2)),
          rowAbs: rowAbs2 ?? '',
          row: Number(row2),
        };
        let first = start;
        if (first.col > end.col) {
          // Keep rows attached to their endpoints; swapping columns only
          // preserves the referenced rectangle.
          const firstCol = { col: first.col, colAbs: first.colAbs };
          first = { ...first, col: end.col, colAbs: end.colAbs };
          end = { ...end, ...firstCol };
        }
        return `${renderEndpoint(first)}:${renderEndpoint(end)}`;
      },
    );
    return withCellReferences.replace(
      FULL_COLUMN_REF_RE,
      (
        _match,
        colAbs1: string,
        col1: string,
        colAbs2: string,
        col2: string,
      ) => {
        const firstIndex = columnLetterToIndex(col1);
        const secondIndex = columnLetterToIndex(col2);
        const from = Math.min(firstIndex, secondIndex);
        const to = Math.max(firstIndex, secondIndex);
        const mappedColumns = Array.from({ length: to - from + 1 }, (_, i) =>
          mapColumn(from + i),
        );
        const start = Math.min(...mappedColumns);
        const end = Math.max(...mappedColumns);
        return `${colAbs1}${columnIndexToLetter(start)}:${colAbs2}${columnIndexToLetter(end)}`;
      },
    );
  };

  return formula
    .split(STRING_LITERAL_SPLIT_RE)
    .map((segment, i) =>
      i % 2 === 1 ? segment : rewriteLocalReferences(segment, remapSegment),
    )
    .join('');
}
