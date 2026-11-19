import { BorderStyle } from 'docx';
import type { HTMLElement } from 'node-html-parser';

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CCCCCC',
};

const TABLE_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };

/**
 * A table without a header row carries the recipient address and sender
 * information block of a letter, so it must not render as a visible grid.
 * Mirrors `markLayoutTables` on the PDF path — see letter-layout-tables.ts.
 */
const LAYOUT_TABLE_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const LAYOUT_CELL_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 };

/** Borders and padding for a cell — a layout cell carries neither. */
export function cellFrame(isLayout: boolean) {
  if (isLayout) {
    return { borders: LAYOUT_TABLE_BORDERS, margins: LAYOUT_CELL_MARGINS };
  }
  return { borders: TABLE_BORDERS };
}

function parseSpan(attr: string | undefined): number | undefined {
  const span = parseInt(attr ?? '', 10);
  return Number.isFinite(span) ? span : undefined;
}

export function cellSpans(cell: HTMLElement) {
  const columnSpan = parseSpan(cell.getAttribute('colspan'));
  const rowSpan = parseSpan(cell.getAttribute('rowspan'));

  return {
    ...(columnSpan && columnSpan > 1 && { columnSpan }),
    ...(rowSpan && rowSpan > 1 && { rowSpan }),
  };
}

export function tableColumnWidths(rows: HTMLElement[], tableWidth: number) {
  const columnCount = rows.reduce((largest, row) => {
    const cells = row.querySelectorAll(':scope > td, :scope > th');
    const count = cells.reduce((total, cell) => {
      const span = cellSpans(cell).columnSpan ?? 1;
      return total + span;
    }, 0);
    return Math.max(largest, count);
  }, 1);
  const width = Math.floor(tableWidth / columnCount);
  return Array.from({ length: columnCount }, () => width);
}
